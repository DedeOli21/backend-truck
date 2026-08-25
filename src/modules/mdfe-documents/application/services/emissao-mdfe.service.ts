import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CteDocumentsService } from '@cte-documents/application/services/cte-documents.service';
import { TrucksService } from '@trucks/application/services/trucks.service';
import { DriversService } from '@drivers/application/services/drivers.service';
import { DadosMdfe, gerarMdfeXml } from '@nf-e/domain/emissao/gerar-mdfe-xml';
import { assinarXml } from '@nf-e/infrastructure/assinatura/assinar-xml';
import { CertificadoPem } from '@nf-e/infrastructure/assinatura/certificado';
import { EMISSOR_CONFIG, EmissorConfig } from '@nf-e/infrastructure/emissao/emissor.config';
import {
  CERTIFICADO_EMISSAO,
  TRANSMISSOR_SEFAZ,
  TransmissorSefaz,
} from '@nf-e/application/services/emissao-cte.service';
import { endpointRecepcaoMdfe, endpointEncerramentoMdfe } from '@nf-e/infrastructure/sefaz/endpoints-mdfe';
import {
  montarEnvelopeRecepcaoMdfe,
  montarMdfeProc,
  parseRetornoRecepcaoMdfe,
} from '@nf-e/infrastructure/sefaz/recepcao-mdfe';
import {
  DadosEncerramentoMdfe,
  montarEnvelopeEventoMdfe,
  montarEventoEncerramentoMdfe,
  parseRetornoEventoMdfe,
  RetornoEventoMdfe,
} from '@nf-e/infrastructure/sefaz/evento-encerramento-mdfe';
import {
  MDFE_NUMERACAO_REPOSITORY,
  MdfeNumeracaoRepository,
} from '@mdfe-documents/infrastructure/emissao/mdfe-numeracao.repository';
import { EmitirMdfeDto } from '@mdfe-documents/presentation/dtos/emitir-mdfe.dto';

export interface ResultadoEmissaoMdfe {
  autorizado: boolean;
  chave: string;
  numero: number;
  serie: number;
  ambiente: 1 | 2;
  codigoStatus: number;
  motivo: string;
  protocolo: string | null;
  autorizadoEm: string | null;
  xml: string | null;
  cteChaves: string[];
  truckId: string;
  driverId: string;
  ufFim: string;
  municipioDescarga: { codigoMunicipio: string; municipio: string };
  valorCarga: number;
  pesoBrutoKg: number;
}

/** Um caminhão pesa (tara) a partir do que a tela de frota registrar; sem isso, omite o campo. */
const TARA_PADRAO_KG = undefined;

@Injectable()
export class EmissaoMdfeService {
  private readonly logger = new Logger(EmissaoMdfeService.name);

  constructor(
    @Inject(MDFE_NUMERACAO_REPOSITORY) private readonly numeracao: MdfeNumeracaoRepository,
    @Inject(TRANSMISSOR_SEFAZ) private readonly transmissor: TransmissorSefaz,
    @Inject(EMISSOR_CONFIG) private readonly emissor: EmissorConfig,
    @Inject(CERTIFICADO_EMISSAO) private readonly certificado: CertificadoPem | null,
    @Inject(CteDocumentsService) private readonly cteDocumentos: CteDocumentsService,
    @Inject(TrucksService) private readonly trucks: TrucksService,
    @Inject(DriversService) private readonly drivers: DriversService,
  ) {}

  async emitir(dto: EmitirMdfeDto, ownerUserId: string): Promise<ResultadoEmissaoMdfe> {
    if (!this.certificado) {
      throw new ServiceUnavailableException(
        'Emissão indisponível: certificado digital A1 não configurado neste ambiente.',
      );
    }

    if (!dto.cteChaves.length) {
      throw new BadRequestException('Selecione ao menos um CT-e da viagem.');
    }

    const ctes = await Promise.all(
      dto.cteChaves.map((chave) => this.cteDocumentos.buscarPorChave(chave, ownerUserId)),
    );

    const naoAutorizado = ctes.find((cte) => cte.situacao !== 'AUTORIZADA');
    if (naoAutorizado) {
      throw new BadRequestException(
        `CT-e ${naoAutorizado.chave} não está autorizado (situação: ${naoAutorizado.situacao ?? 'desconhecida'}). Só CT-e autorizado entra no MDF-e.`,
      );
    }

    const truck = await this.trucks.findById(dto.truckId, ownerUserId);
    const driver = await this.drivers.findById(dto.driverId, ownerUserId);

    const ambiente = this.emissor.ambiente;
    const serie = this.emissor.serie;
    const numero = await this.numeracao.proximoNumero(ambiente, serie);

    const valorCarga = ctes.reduce((total, cte) => total + Number(cte.valorCarga ?? 0), 0);
    const pesoBrutoKg = ctes.reduce((total, cte) => total + Number(cte.pesoBruto ?? 0), 0);

    const dados: DadosMdfe = {
      ambiente,
      serie,
      numero,
      codigoNumerico: Math.floor(Math.random() * 99_999_999),
      emitidoEm: new Date(),
      ufIni: this.emissor.emitente.endereco.uf,
      ufFim: dto.ufFim,
      ufPercurso: dto.ufPercurso ?? [],
      municipioCarregamento: dto.municipioCarregamento,
      municipioDescarga: dto.municipioDescarga,
      emitente: this.emissor.emitente,
      veiculo: {
        placa: truck.plate,
        rntrc: truck.rntrc ?? this.emissor.emitente.rntrc ?? '',
        // Capacidade cadastrada em toneladas; o MDF-e pede em kg.
        tara: TARA_PADRAO_KG,
        capacidadeKg: truck.capacity ? truck.capacity * 1000 : undefined,
        uf: this.emissor.emitente.endereco.uf,
      },
      condutor: { nome: driver.fullName, cpf: driver.cpf },
      cteChaves: dto.cteChaves,
      totais: { valorCarga, pesoBrutoKg },
    };

    const { xml, chave, id } = gerarMdfeXml(dados);
    const assinado = assinarXml(xml, 'infMDFe', id, this.certificado);
    const url = endpointRecepcaoMdfe(ambiente);

    this.logger.log(`Emitindo MDF-e ${numero}/${serie} (ambiente ${ambiente}) para o Ambiente Nacional.`);

    const resposta = await this.transmissor.enviar(url, montarEnvelopeRecepcaoMdfe(assinado));
    const retorno = parseRetornoRecepcaoMdfe(resposta);

    return {
      autorizado: retorno.autorizado,
      chave,
      numero,
      serie,
      ambiente,
      codigoStatus: retorno.codigoStatus,
      motivo: retorno.motivo,
      protocolo: retorno.protocolo,
      autorizadoEm: retorno.autorizadoEm,
      xml: retorno.autorizado && retorno.protocoloXml ? montarMdfeProc(assinado, retorno.protocoloXml) : null,
      cteChaves: dto.cteChaves,
      truckId: dto.truckId,
      driverId: dto.driverId,
      ufFim: dto.ufFim,
      municipioDescarga: dto.municipioDescarga,
      valorCarga,
      pesoBrutoKg,
    };
  }

  /** Transmite o evento de encerramento (110112) à SEFAZ. Não persiste nada. */
  async encerrar(dados: DadosEncerramentoMdfe): Promise<RetornoEventoMdfe> {
    if (!this.certificado) {
      throw new ServiceUnavailableException(
        'Encerramento indisponível: certificado digital A1 não configurado neste ambiente.',
      );
    }

    const { xml, id } = montarEventoEncerramentoMdfe(dados);
    const assinado = assinarXml(xml, 'infEvento', id, this.certificado);
    const url = endpointEncerramentoMdfe(dados.ambiente);

    const resposta = await this.transmissor.enviar(url, montarEnvelopeEventoMdfe(assinado));
    return parseRetornoEventoMdfe(resposta);
  }
}
