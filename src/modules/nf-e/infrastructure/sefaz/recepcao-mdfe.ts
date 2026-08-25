import { gzipSync } from 'zlib';
import { buscarRecursivo, parser, texto } from '@nf-e/infrastructure/sefaz/consulta-protocolo';

export interface RetornoRecepcaoMdfe {
  autorizado: boolean;
  codigoStatus: number;
  motivo: string;
  protocolo: string | null;
  autorizadoEm: string | null;
  chave: string | null;
  /** XML do MDF-e com o protocolo anexado, pronto para guardar. */
  protocoloXml: string | null;
}

// 100 autorizado. Os demais são rejeição (schema, regra de negócio etc.).
const AUTORIZADOS = new Set([100]);

/**
 * A recepção do MDF-e (MDFeRecepcaoSinc) é síncrona, igual a do CT-e 4.00:
 * espera o XML comprimido em GZip e codificado em base64 dentro de
 * mdfeDadosMsg.
 */
export const montarEnvelopeRecepcaoMdfe = (mdfeAssinado: string): string => {
  const documento = mdfeAssinado.replace(/<\?xml[^>]*\?>/, '').trim();
  const comprimido = gzipSync(Buffer.from(documento, 'utf8')).toString('base64');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">` +
    `<soap12:Body>` +
    `<mdfeDadosMsg xmlns="http://www.portalfiscal.inf.br/mdfe/wsdl/MDFeRecepcaoSinc">` +
    comprimido +
    `</mdfeDadosMsg>` +
    `</soap12:Body>` +
    `</soap12:Envelope>`
  );
};

export const parseRetornoRecepcaoMdfe = (xml: string): RetornoRecepcaoMdfe => {
  const arvore = parser.parse(xml);
  const ret = buscarRecursivo(arvore, 'mdfeProc') ?? buscarRecursivo(arvore, 'retMDFe');

  if (!ret) {
    throw new Error('Resposta inesperada da SEFAZ: mdfeProc/retMDFe não encontrado.');
  }

  const infProt = buscarRecursivo(ret, 'infProt');
  const codigoStatus = Number(infProt ? infProt.cStat : ret.cStat);
  const motivo = texto(infProt ? infProt.xMotivo : ret.xMotivo) ?? '';
  const autorizado = AUTORIZADOS.has(codigoStatus);

  const protocoloXml = /<protMDFe[\s\S]*?<\/protMDFe>/.exec(xml)?.[0] ?? null;

  return {
    autorizado,
    codigoStatus,
    motivo,
    protocolo: infProt ? texto(infProt.nProt) : null,
    autorizadoEm: infProt ? texto(infProt.dhRecbto) : null,
    chave: infProt ? texto(infProt.chMDFe) : null,
    protocoloXml,
  };
};

/** Junta MDF-e assinado e protocolo no mdfeProc, que é o arquivo que se guarda. */
export const montarMdfeProc = (mdfeAssinado: string, protocoloXml: string): string =>
  `<?xml version="1.0" encoding="UTF-8"?>` +
  `<mdfeProc xmlns="http://www.portalfiscal.inf.br/mdfe" versao="3.00">` +
  mdfeAssinado.replace(/<\?xml[^>]*\?>/, '').trim() +
  protocoloXml +
  `</mdfeProc>`;
