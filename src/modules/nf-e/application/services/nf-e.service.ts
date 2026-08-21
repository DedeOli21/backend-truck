import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import {
  ConsultaSefaz,
  NFE_PROVIDER,
  NfeProvider,
  SituacaoNfe,
} from '@nf-e/domain/providers/nfe.provider';
import { isValidUf } from '@nf-e/domain/validators/uf.validator';
import { ChaveAcesso, parseChaveAcesso } from '@nf-e/domain/value-objects/chave-acesso';
import { OrigemLeitura, extrairChaveDeCodigo } from '@nf-e/domain/value-objects/qr-code';
import { MOTIVO_NAO_CONFIGURADO } from '@nf-e/infrastructure/providers/not-configured-nfe.provider';
import { ValidarCodigoDto } from '@nf-e/presentation/dtos/validar-codigo.dto';

export interface SefazInfo {
  consultado: boolean;
  motivo: string | null;
  situacao: SituacaoNfe | null;
  protocolo: string | null;
  dataAutorizacao: string | null;
  emitente: ConsultaSefaz['emitente'];
  destinatario: ConsultaSefaz['destinatario'];
  valorTotal: number | null;
  xmlUrl: string | null;
}

export interface ConsultaNfeResponse {
  documento: ChaveAcesso;
  sefaz: SefazInfo;
}

export interface ValidacaoCodigoResponse extends ConsultaNfeResponse {
  valido: true;
  origem: OrigemLeitura;
}

const sefazNaoConsultado = (motivo: string): SefazInfo => ({
  consultado: false,
  motivo,
  situacao: null,
  protocolo: null,
  dataAutorizacao: null,
  emitente: null,
  destinatario: null,
  valorTotal: null,
  xmlUrl: null,
});

const sefazConsultado = (consulta: ConsultaSefaz): SefazInfo => ({
  consultado: true,
  motivo: null,
  situacao: consulta.situacao,
  protocolo: consulta.protocolo,
  dataAutorizacao: consulta.dataAutorizacao,
  emitente: consulta.emitente,
  destinatario: consulta.destinatario,
  valorTotal: consulta.valorTotal,
  xmlUrl: consulta.xmlUrl,
});

@Injectable()
export class NfeService {
  private readonly logger = new Logger(NfeService.name);

  constructor(@Inject(NFE_PROVIDER) private readonly provider: NfeProvider) {}

  /**
   * A chave de acesso carrega UF, emitente, modelo, série e número. Esses dados
   * saem da própria chave e não dependem da SEFAZ; o que depende é a situação
   * do documento (autorizada, cancelada, denegada).
   */
  private async comSefaz(documento: ChaveAcesso): Promise<ConsultaNfeResponse> {
    if (!this.provider.isConfigured()) {
      return { documento, sefaz: sefazNaoConsultado(MOTIVO_NAO_CONFIGURADO) };
    }

    try {
      const consulta = await this.provider.consultarPorChave(documento);
      return { documento, sefaz: sefazConsultado(consulta) };
    } catch (error) {
      const motivo = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Falha ao consultar a SEFAZ para a chave ${documento.chave}: ${motivo}`);
      return { documento, sefaz: sefazNaoConsultado(motivo) };
    }
  }

  async consultarPorChave(chave: string): Promise<ConsultaNfeResponse> {
    return this.comSefaz(parseChaveAcesso(chave));
  }

  async consultarPorUfNumero(uf: string, numero: number): Promise<ConsultaNfeResponse> {
    const ufNormalizada = (uf ?? '').toUpperCase();

    if (!isValidUf(ufNormalizada)) {
      throw new BadRequestException(`UF inválida: ${uf}.`);
    }

    if (!Number.isInteger(numero) || numero < 1 || numero > 999999999) {
      throw new BadRequestException('Número da nota deve ser um inteiro entre 1 e 999999999.');
    }

    // A SEFAZ não expõe consulta por UF + número: o webservice exige a chave de
    // acesso completa. Esta rota depende de uma integração que resolva o número
    // para a chave, e por isso falha de forma explícita enquanto não existir.
    const consulta = await this.provider.consultarPorNumero(ufNormalizada, numero);

    return {
      documento: {
        chave: '',
        uf: ufNormalizada,
        codigoUf: 0,
        anoEmissao: 0,
        mesEmissao: 0,
        cnpjEmitente: '',
        modelo: 0,
        tipoDocumento: 'NFE',
        serie: 0,
        numero,
        tipoEmissao: 0,
        codigoNumerico: 0,
        digitoVerificador: 0,
      },
      sefaz: sefazConsultado(consulta),
    };
  }

  async validarCodigo(dto: ValidarCodigoDto): Promise<ValidacaoCodigoResponse> {
    const leitura = extrairChaveDeCodigo(dto.conteudo);
    const consulta = await this.comSefaz(parseChaveAcesso(leitura.chave));

    return { valido: true, origem: leitura.origem, ...consulta };
  }
}
