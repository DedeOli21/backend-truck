import { SituacaoNfe } from '@nf-e/domain/providers/nfe.provider';
import { buscarRecursivo, parser, texto } from '@nf-e/infrastructure/sefaz/consulta-protocolo';

export interface RetornoRecepcao {
  autorizado: boolean;
  codigoStatus: number;
  motivo: string;
  protocolo: string | null;
  autorizadoEm: string | null;
  chave: string | null;
  situacao: SituacaoNfe | null;
  /** XML do CT-e com o protocolo anexado, pronto para guardar. */
  protocoloXml: string | null;
}

export const montarEnvelopeRecepcao = (cteAssinado: string): string => {
  // O CTeRecepcaoSinc recebe o CT-e dentro de cteDadosMsg, sem lote.
  const documento = cteAssinado.replace(/<\?xml[^>]*\?>/, '').trim();

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">` +
    `<soap12:Body>` +
    `<cteDadosMsg xmlns="http://www.portalfiscal.inf.br/cte/wsdl/CTeRecepcaoSincV4">` +
    documento +
    `</cteDadosMsg>` +
    `</soap12:Body>` +
    `</soap12:Envelope>`
  );
};

// 100 autorizado; 150 autorizado fora do prazo. Os demais são rejeição.
const AUTORIZADOS = new Set([100, 150]);

export const parseRetornoRecepcao = (xml: string): RetornoRecepcao => {
  const arvore = parser.parse(xml);
  const ret = buscarRecursivo(arvore, 'retCTe');

  if (!ret) {
    throw new Error('Resposta inesperada da SEFAZ: retCTe não encontrado.');
  }

  const infProt = buscarRecursivo(ret, 'infProt');
  // Quando autoriza, o status que vale é o do protocolo; quando rejeita, o do envelope.
  const codigoStatus = Number(infProt ? infProt.cStat : ret.cStat);
  const motivo = texto(infProt ? infProt.xMotivo : ret.xMotivo) ?? '';
  const autorizado = AUTORIZADOS.has(codigoStatus);

  const protocoloXml = /<protCTe[\s\S]*?<\/protCTe>/.exec(xml)?.[0] ?? null;

  return {
    autorizado,
    codigoStatus,
    motivo,
    protocolo: infProt ? texto(infProt.nProt) : null,
    autorizadoEm: infProt ? texto(infProt.dhRecbto) : null,
    chave: infProt ? texto(infProt.chCTe) : null,
    situacao: autorizado ? 'AUTORIZADA' : null,
    protocoloXml,
  };
};

/** Junta CT-e assinado e protocolo no cteProc, que é o arquivo que se guarda. */
export const montarCteProc = (cteAssinado: string, protocoloXml: string): string =>
  `<?xml version="1.0" encoding="UTF-8"?>` +
  `<cteProc xmlns="http://www.portalfiscal.inf.br/cte" versao="4.00">` +
  cteAssinado.replace(/<\?xml[^>]*\?>/, '').trim() +
  protocoloXml +
  `</cteProc>`;
