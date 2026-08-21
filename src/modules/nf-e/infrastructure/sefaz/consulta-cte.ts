import { SituacaoNfe } from '@nf-e/domain/providers/nfe.provider';
import {
  RetornoConsulta,
  buscarRecursivo,
  parser,
  situacaoDoStatus,
  texto,
} from '@nf-e/infrastructure/sefaz/consulta-protocolo';

export const montarEnvelopeConsultaCte = (chave: string, tpAmb: 1 | 2): string =>
  `<?xml version="1.0" encoding="utf-8"?>` +
  `<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">` +
  `<soap12:Body>` +
  `<cteDadosMsg xmlns="http://www.portalfiscal.inf.br/cte/wsdl/CTeConsultaV4">` +
  `<consSitCTe xmlns="http://www.portalfiscal.inf.br/cte" versao="4.00">` +
  `<tpAmb>${tpAmb}</tpAmb>` +
  `<xServ>CONSULTAR</xServ>` +
  `<chCTe>${chave}</chCTe>` +
  `</consSitCTe>` +
  `</cteDadosMsg>` +
  `</soap12:Body>` +
  `</soap12:Envelope>`;

export const parseRetornoConsultaCte = (xml: string): RetornoConsulta => {
  const ret = buscarRecursivo(parser.parse(xml), 'retConsSitCTe');

  if (!ret) {
    throw new Error('Resposta inesperada da SEFAZ: retConsSitCTe não encontrado.');
  }

  const codigoStatus = Number(ret.cStat);
  const motivo = texto(ret.xMotivo) ?? '';
  const situacao: SituacaoNfe | null = situacaoDoStatus(codigoStatus);

  if (!situacao) {
    throw new Error(`SEFAZ recusou a consulta do CT-e (cStat ${codigoStatus}): ${motivo}`);
  }

  const infProt = buscarRecursivo(ret, 'infProt');

  return {
    situacao,
    codigoStatus,
    motivo,
    protocolo: infProt ? texto(infProt.nProt) : null,
    dataAutorizacao: infProt ? texto(infProt.dhRecbto) : null,
  };
};
