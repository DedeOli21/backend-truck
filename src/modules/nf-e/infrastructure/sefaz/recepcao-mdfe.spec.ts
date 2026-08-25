import { gunzipSync } from 'zlib';
import {
  montarEnvelopeRecepcaoMdfe,
  montarMdfeProc,
  parseRetornoRecepcaoMdfe,
} from '@nf-e/infrastructure/sefaz/recepcao-mdfe';

const MDFE_ASSINADO = `<?xml version="1.0" encoding="UTF-8"?><MDFe xmlns="http://www.portalfiscal.inf.br/mdfe"><infMDFe Id="MDFe1234"><ide><cUF>35</cUF></ide></infMDFe></MDFe>`;

describe('montarEnvelopeRecepcaoMdfe', () => {
  it('comprime o XML em gzip+base64 dentro do envelope SOAP', () => {
    const envelope = montarEnvelopeRecepcaoMdfe(MDFE_ASSINADO);

    expect(envelope).toContain('mdfeDadosMsg');
    expect(envelope).toContain('MDFeRecepcaoSinc');

    const base64 = /<mdfeDadosMsg[^>]*>([^<]+)<\/mdfeDadosMsg>/.exec(envelope)?.[1] ?? '';
    const descomprimido = gunzipSync(Buffer.from(base64, 'base64')).toString('utf8');

    expect(descomprimido).toContain('<cUF>35</cUF>');
  });
});

const RETORNO_AUTORIZADO = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <mdfeResultMsg xmlns="http://www.portalfiscal.inf.br/mdfe/wsdl/MDFeRecepcaoSinc">
      <mdfeProc xmlns="http://www.portalfiscal.inf.br/mdfe">
        <protMDFe><infProt>
          <cStat>100</cStat>
          <xMotivo>Autorizado o uso do MDF-e</xMotivo>
          <chMDFe>35260808789863000100580010000000151123456781</chMDFe>
          <nProt>135260000012345</nProt>
          <dhRecbto>2026-08-25T10:05:00-03:00</dhRecbto>
        </infProt></protMDFe>
      </mdfeProc>
    </mdfeResultMsg>
  </soap:Body>
</soap:Envelope>`;

const RETORNO_REJEITADO = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <mdfeResultMsg xmlns="http://www.portalfiscal.inf.br/mdfe/wsdl/MDFeRecepcaoSinc">
      <mdfeProc xmlns="http://www.portalfiscal.inf.br/mdfe">
        <cStat>225</cStat>
        <xMotivo>Rejeição: falha no schema XML</xMotivo>
      </mdfeProc>
    </mdfeResultMsg>
  </soap:Body>
</soap:Envelope>`;

describe('parseRetornoRecepcaoMdfe', () => {
  it('reconhece autorização e traz o protocolo', () => {
    const retorno = parseRetornoRecepcaoMdfe(RETORNO_AUTORIZADO);

    expect(retorno.autorizado).toBe(true);
    expect(retorno.codigoStatus).toBe(100);
    expect(retorno.protocolo).toBe('135260000012345');
    expect(retorno.autorizadoEm).toBe('2026-08-25T10:05:00-03:00');
  });

  it('reconhece rejeição e traz o motivo', () => {
    const retorno = parseRetornoRecepcaoMdfe(RETORNO_REJEITADO);

    expect(retorno.autorizado).toBe(false);
    expect(retorno.codigoStatus).toBe(225);
    expect(retorno.motivo).toContain('Rejeição');
    expect(retorno.protocolo).toBeNull();
  });
});

describe('montarMdfeProc', () => {
  it('junta o MDF-e assinado e o protocolo no XML final', () => {
    const protocoloXml = '<protMDFe><infProt><cStat>100</cStat></infProt></protMDFe>';
    const proc = montarMdfeProc(MDFE_ASSINADO, protocoloXml);

    expect(proc).toContain('<mdfeProc');
    expect(proc).toContain('<infMDFe Id="MDFe1234">');
    expect(proc).toContain(protocoloXml);
  });
});
