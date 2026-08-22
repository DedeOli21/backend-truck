import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DadosCte, cfopSugerido, gerarCteXml, MAX_PROD_PRED } from '@nf-e/domain/emissao/gerar-cte-xml';
import { parseNfeXml } from '@nf-e/domain/value-objects/nfe-xml';
import { assinarXml } from '@nf-e/infrastructure/assinatura/assinar-xml';
import { CertificadoPem } from '@nf-e/infrastructure/assinatura/certificado';
import {
  NUMERACAO_REPOSITORY,
  NumeracaoRepository,
} from '@nf-e/infrastructure/emissao/numeracao.repository';
import {
  EMISSOR_CONFIG,
  EmissorConfig,
} from '@nf-e/infrastructure/emissao/emissor.config';
import { endpointRecepcaoCte } from '@nf-e/infrastructure/sefaz/endpoints';
import {
  montarCteProc,
  montarEnvelopeRecepcao,
  parseRetornoRecepcao,
} from '@nf-e/infrastructure/sefaz/recepcao-cte';
import { ParticipanteNfe } from '@nf-e/domain/value-objects/nfe-xml';
import { EmitirCteDto } from '@nf-e/presentation/dtos/emitir-cte.dto';

export interface ResultadoEmissao {
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
  nfeTransportada: string;
}

/** Enviar o XML assinado à SEFAZ; separado para o service poder ser testado sem rede. */
export interface TransmissorSefaz {
  enviar(url: string, envelope: string): Promise<string>;
}

export const TRANSMISSOR_SEFAZ = 'TRANSMISSOR_SEFAZ';
export const CERTIFICADO_EMISSAO = 'CERTIFICADO_EMISSAO';

/**
 * Converte o participante da NF-e no formato do CT-e. O endereço vem completo
 * do XML: mandar "NAO INFORMADO" faz a SEFAZ rejeitar.
 */
const participanteDaNfe = (participante: ParticipanteNfe) => ({
  cnpjCpf: participante.cnpjCpf,
  nome: participante.nome,
  inscricaoEstadual: participante.inscricaoEstadual,
  endereco: {
    logradouro: participante.endereco.logradouro ?? 'NAO INFORMADO',
    numero: participante.endereco.numero ?? 'S/N',
    bairro: participante.endereco.bairro ?? 'CENTRO',
    codigoMunicipio: participante.endereco.codigoMunicipio ?? '',
    municipio: participante.municipio ?? '',
    cep: participante.endereco.cep ?? '',
    uf: participante.uf ?? '',
  },
});

@Injectable()
export class EmissaoCteService {
  private readonly logger = new Logger(EmissaoCteService.name);

  constructor(
    @Inject(NUMERACAO_REPOSITORY) private readonly numeracao: NumeracaoRepository,
    @Inject(TRANSMISSOR_SEFAZ) private readonly transmissor: TransmissorSefaz,
    @Inject(EMISSOR_CONFIG) private readonly emissor: EmissorConfig,
    @Inject(CERTIFICADO_EMISSAO) private readonly certificado: CertificadoPem | null,
  ) {}

  async emitir(dto: EmitirCteDto): Promise<ResultadoEmissao> {
    if (!this.certificado) {
      throw new ServiceUnavailableException(
        'Emissão indisponível: certificado digital A1 não configurado neste ambiente.',
      );
    }

    const nfe = parseNfeXml(dto.nfeXml);

    if (nfe.situacao && nfe.situacao !== 'AUTORIZADA') {
      throw new BadRequestException(
        `A NF-e está ${nfe.situacao.toLowerCase()}. Só é possível emitir CT-e para nota autorizada.`,
      );
    }

    if (!nfe.emitente || !nfe.destinatario) {
      throw new BadRequestException('A NF-e não traz emitente ou destinatário completos.');
    }

    const faltando = [
      !nfe.emitente.endereco.codigoMunicipio && 'código do município do remetente',
      !nfe.destinatario.endereco.codigoMunicipio && 'código do município do destinatário',
      !nfe.emitente.endereco.cep && 'CEP do remetente',
      !nfe.destinatario.endereco.cep && 'CEP do destinatário',
    ].filter(Boolean);

    if (faltando.length > 0) {
      throw new BadRequestException(
        `A NF-e não traz ${faltando.join(', ')}. A SEFAZ exige esses campos no CT-e.`,
      );
    }

    const ambiente = dto.ambiente ?? this.emissor.ambiente;
    const serie = dto.serie ?? this.emissor.serie;
    const numero = await this.numeracao.proximoNumero(ambiente, serie);

    const dados: DadosCte = {
      ambiente,
      serie,
      numero,
      // Código numérico aleatório, exigido pela SEFAZ para compor a chave.
      codigoNumerico: Math.floor(Math.random() * 99_999_999),
      emitidoEm: new Date(),
      cfop:
        dto.cfop ??
        cfopSugerido(
          this.emissor.emitente.endereco.uf,
          nfe.emitente.uf ?? '',
          nfe.destinatario.uf ?? '',
        ),
      naturezaOperacao: 'PRESTACAO DE SERVICO DE TRANSPORTE',
      tomador: dto.tomador ?? 3,
      // Início e fim da prestação saem dos municípios da própria NF-e.
      inicio: {
        codigoMunicipio: nfe.emitente.endereco.codigoMunicipio ?? '',
        municipio: nfe.emitente.municipio ?? '',
        uf: nfe.emitente.uf ?? '',
      },
      fim: {
        codigoMunicipio: nfe.destinatario.endereco.codigoMunicipio ?? '',
        municipio: nfe.destinatario.municipio ?? '',
        uf: nfe.destinatario.uf ?? '',
      },
      emitente: this.emissor.emitente,
      remetente: participanteDaNfe(nfe.emitente),
      destinatario: participanteDaNfe(nfe.destinatario),
      valorTotal: dto.valorFrete,
      valorReceber: dto.valorFrete,
      componentes: dto.componentes?.length
        ? dto.componentes
        : [{ nome: 'Frete valor', valor: dto.valorFrete }],
      valorCarga: nfe.valorTotal ?? 0,
      produtoPredominante: (nfe.itens[0]?.descricao ?? 'CARGA GERAL').slice(0, MAX_PROD_PRED).trimEnd(),
      pesoBruto: nfe.volumes.pesoBruto ?? nfe.volumes.pesoLiquido ?? 0,
      notas: [{ chave: nfe.chave }],
      observacoes: dto.observacoes ?? null,
    };

    const { xml, chave, id } = gerarCteXml(dados);
    const assinado = assinarXml(xml, 'infCte', id, this.certificado);
    const url = endpointRecepcaoCte(this.emissor.emitente.endereco.uf, ambiente);

    this.logger.log(
      `Emitindo CT-e ${numero}/${serie} (ambiente ${ambiente}) para a SEFAZ ${this.emissor.emitente.endereco.uf}.`,
    );

    const resposta = await this.transmissor.enviar(
      url,
      montarEnvelopeRecepcao(assinado),
    );
    const retorno = parseRetornoRecepcao(resposta);

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
      xml:
        retorno.autorizado && retorno.protocoloXml
          ? montarCteProc(assinado, retorno.protocoloXml)
          : null,
      nfeTransportada: nfe.chave,
    };
  }
}
