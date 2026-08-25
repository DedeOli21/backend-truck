import { ufToCode } from '@nf-e/domain/validators/uf.validator';
import { buscarRecursivo, parser, texto } from '@nf-e/infrastructure/sefaz/consulta-protocolo';

export interface DadosEncerramentoMdfe {
  chave: string;
  /** Protocolo de autorização do MDF-e, exigido pelo evento de encerramento. */
  protocolo: string;
  ambiente: 1 | 2;
  cnpjEmitente: string;
  dataEvento: Date;
  municipioDescarga: { codigoMunicipio: string };
  ufDescarga: string;
}

export interface EventoMdfeGerado {
  xml: string;
  id: string;
}

export interface RetornoEventoMdfe {
  sucesso: boolean;
  codigoStatus: number;
  motivo: string;
  protocolo: string | null;
}

const somenteDigitos = (valor: string) => (valor ?? '').replace(/\D/g, '');

const dataEvento = (data: Date): string => {
  const local = new Date(data.getTime() - 3 * 3600 * 1000);
  return `${local.toISOString().slice(0, 19)}-03:00`;
};

/** Evento 110112 (Encerramento), sequência 1: a viagem só encerra uma vez. */
const TIPO_EVENTO = '110112';
const SEQUENCIA = 1;

/**
 * Monta o evento de encerramento do MDF-e. Não assina: a assinatura entra
 * depois, sobre este XML (tag infEvento).
 */
export const montarEventoEncerramentoMdfe = (dados: DadosEncerramentoMdfe): EventoMdfeGerado => {
  const codigoUf = ufToCode(dados.ufDescarga);

  if (!codigoUf) {
    throw new Error(`UF de descarga inválida: ${dados.ufDescarga}`);
  }

  const id = `ID${TIPO_EVENTO}${dados.chave}${String(SEQUENCIA).padStart(2, '0')}`;

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<evento xmlns="http://www.portalfiscal.inf.br/mdfe" versao="3.00">` +
    `<infEvento Id="${id}">` +
    `<cOrgao>${codigoUf}</cOrgao>` +
    `<tpAmb>${dados.ambiente}</tpAmb>` +
    `<CNPJ>${somenteDigitos(dados.cnpjEmitente)}</CNPJ>` +
    `<chMDFe>${dados.chave}</chMDFe>` +
    `<dhEvento>${dataEvento(dados.dataEvento)}</dhEvento>` +
    `<tpEvento>${TIPO_EVENTO}</tpEvento>` +
    `<nSeqEvento>${SEQUENCIA}</nSeqEvento>` +
    `<detEvento versaoEvento="3.00">` +
    `<evEncMDFe>` +
    `<descEvento>Encerramento</descEvento>` +
    `<nProt>${dados.protocolo}</nProt>` +
    `<cUF>${codigoUf}</cUF>` +
    `<cMun>${dados.municipioDescarga.codigoMunicipio}</cMun>` +
    `</evEncMDFe>` +
    `</detEvento>` +
    `</infEvento>` +
    `</evento>`;

  return { xml, id };
};

/** Envelopa o evento assinado no lote exigido pelo webservice de eventos. */
export const montarEnvelopeEventoMdfe = (eventoAssinado: string): string => {
  const documento = eventoAssinado.replace(/<\?xml[^>]*\?>/, '').trim();
  const envEvento =
    `<envEvento xmlns="http://www.portalfiscal.inf.br/mdfe" versao="3.00">` +
    `<idLote>1</idLote>` +
    documento +
    `</envEvento>`;

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">` +
    `<soap12:Body>` +
    `<mdfeDadosMsg xmlns="http://www.portalfiscal.inf.br/mdfe/wsdl/MDFeRecepcaoEvento">` +
    envEvento +
    `</mdfeDadosMsg>` +
    `</soap12:Body>` +
    `</soap12:Envelope>`
  );
};

// 135 = evento registrado e vinculado ao MDF-e.
const SUCESSO = new Set([135]);

export const parseRetornoEventoMdfe = (xml: string): RetornoEventoMdfe => {
  const arvore = parser.parse(xml);
  const infEvento = buscarRecursivo(arvore, 'infEvento') ?? buscarRecursivo(arvore, 'retEventoMDFe');

  if (!infEvento) {
    throw new Error('Resposta inesperada da SEFAZ: infEvento não encontrado.');
  }

  const codigoStatus = Number(infEvento.cStat);

  return {
    sucesso: SUCESSO.has(codigoStatus),
    codigoStatus,
    motivo: texto(infEvento.xMotivo) ?? '',
    protocolo: texto(infEvento.nProt),
  };
};
