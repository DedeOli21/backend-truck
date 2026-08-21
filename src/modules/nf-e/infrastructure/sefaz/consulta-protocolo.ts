import { XMLParser } from 'fast-xml-parser';
import { SituacaoNfe } from '@nf-e/domain/providers/nfe.provider';

export interface RetornoConsulta {
  situacao: SituacaoNfe;
  codigoStatus: number;
  motivo: string;
  protocolo: string | null;
  dataAutorizacao: string | null;
}

export const montarEnvelopeConsulta = (chave: string, tpAmb: 1 | 2): string =>
  `<?xml version="1.0" encoding="utf-8"?>` +
  `<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">` +
  `<soap12:Body>` +
  `<nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4">` +
  `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">` +
  `<tpAmb>${tpAmb}</tpAmb>` +
  `<xServ>CONSULTAR</xServ>` +
  `<chNFe>${chave}</chNFe>` +
  `</consSitNFe>` +
  `</nfeDadosMsg>` +
  `</soap12:Body>` +
  `</soap12:Envelope>`;

const parser = new XMLParser({
  ignoreAttributes: true,
  removeNSPrefix: true,
  parseTagValue: false,
});

// Códigos de retorno da consulta de protocolo (NT 2015/002 e manual da NF-e).
const CANCELADA = new Set([101, 135, 151, 155]);
const DENEGADA = new Set([110, 301, 302, 303]);
const INEXISTENTE = new Set([217]);

const buscarRecursivo = (node: unknown, alvo: string): Record<string, unknown> | null => {
  if (!node || typeof node !== 'object') {
    return null;
  }

  for (const [chave, valor] of Object.entries(node as Record<string, unknown>)) {
    if (chave === alvo && valor && typeof valor === 'object') {
      return valor as Record<string, unknown>;
    }

    const encontrado = buscarRecursivo(valor, alvo);

    if (encontrado) {
      return encontrado;
    }
  }

  return null;
};

const texto = (valor: unknown): string | null =>
  valor === undefined || valor === null ? null : String(valor);

export const parseRetornoConsulta = (xml: string): RetornoConsulta => {
  const arvore = parser.parse(xml);
  const ret = buscarRecursivo(arvore, 'retConsSitNFe');

  if (!ret) {
    throw new Error('Resposta inesperada da SEFAZ: retConsSitNFe não encontrado.');
  }

  const codigoStatus = Number(ret.cStat);
  const motivo = texto(ret.xMotivo) ?? '';
  const infProt = buscarRecursivo(ret, 'infProt');

  const situacao: SituacaoNfe | null =
    codigoStatus === 100
      ? 'AUTORIZADA'
      : CANCELADA.has(codigoStatus)
        ? 'CANCELADA'
        : DENEGADA.has(codigoStatus)
          ? 'DENEGADA'
          : INEXISTENTE.has(codigoStatus)
            ? 'INEXISTENTE'
            : null;

  // Qualquer outro cStat é recusa da requisição (UF divergente, chave inválida,
  // certificado sem permissão), não situação do documento.
  if (!situacao) {
    throw new Error(`SEFAZ recusou a consulta (cStat ${codigoStatus}): ${motivo}`);
  }

  return {
    situacao,
    codigoStatus,
    motivo,
    protocolo: infProt ? texto(infProt.nProt) : null,
    dataAutorizacao: infProt ? texto(infProt.dhRecbto) : null,
  };
};
