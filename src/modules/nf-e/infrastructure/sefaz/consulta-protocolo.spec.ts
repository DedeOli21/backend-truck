import {
  montarEnvelopeConsulta,
  parseRetornoConsulta,
} from '@nf-e/infrastructure/sefaz/consulta-protocolo';

const CHAVE = '35260811222333000181550010000010421123456784';

const envelopeRetorno = (miolo: string) => `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <nfeResultMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4">
      ${miolo}
    </nfeResultMsg>
  </soap:Body>
</soap:Envelope>`;

describe('montarEnvelopeConsulta', () => {
  it('monta o SOAP com tpAmb, xServ e a chave', () => {
    const envelope = montarEnvelopeConsulta(CHAVE, 1);

    expect(envelope).toContain('<tpAmb>1</tpAmb>');
    expect(envelope).toContain('<xServ>CONSULTAR</xServ>');
    expect(envelope).toContain(`<chNFe>${CHAVE}</chNFe>`);
    expect(envelope).toContain('versao="4.00"');
  });

  it('usa o ambiente de homologacao quando pedido', () => {
    expect(montarEnvelopeConsulta(CHAVE, 2)).toContain('<tpAmb>2</tpAmb>');
  });
});

describe('parseRetornoConsulta', () => {
  it('le nota autorizada com protocolo', () => {
    const xml = envelopeRetorno(`
      <retConsSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <tpAmb>1</tpAmb>
        <cStat>100</cStat>
        <xMotivo>Autorizado o uso da NF-e</xMotivo>
        <chNFe>${CHAVE}</chNFe>
        <protNFe versao="4.00">
          <infProt>
            <chNFe>${CHAVE}</chNFe>
            <dhRecbto>2026-08-10T12:00:00-03:00</dhRecbto>
            <nProt>135260000123456</nProt>
            <cStat>100</cStat>
            <xMotivo>Autorizado o uso da NF-e</xMotivo>
          </infProt>
        </protNFe>
      </retConsSitNFe>`);

    const resultado = parseRetornoConsulta(xml);

    expect(resultado.situacao).toBe('AUTORIZADA');
    expect(resultado.protocolo).toBe('135260000123456');
    expect(resultado.dataAutorizacao).toBe('2026-08-10T12:00:00-03:00');
    expect(resultado.codigoStatus).toBe(100);
  });

  it('le nota cancelada pelo cStat 101', () => {
    const xml = envelopeRetorno(`
      <retConsSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <cStat>101</cStat>
        <xMotivo>Cancelamento de NF-e homologado</xMotivo>
      </retConsSitNFe>`);

    expect(parseRetornoConsulta(xml).situacao).toBe('CANCELADA');
  });

  it('le nota cancelada pelo cStat 135', () => {
    const xml = envelopeRetorno(`
      <retConsSitNFe xmlns="http://www.portalfiscal.inf.br/nfe">
        <cStat>135</cStat><xMotivo>Evento registrado e vinculado a NF-e</xMotivo>
      </retConsSitNFe>`);

    expect(parseRetornoConsulta(xml).situacao).toBe('CANCELADA');
  });

  it('le nota denegada', () => {
    const xml = envelopeRetorno(`
      <retConsSitNFe xmlns="http://www.portalfiscal.inf.br/nfe">
        <cStat>110</cStat><xMotivo>Uso Denegado</xMotivo>
      </retConsSitNFe>`);

    expect(parseRetornoConsulta(xml).situacao).toBe('DENEGADA');
  });

  it('le nota inexistente na base da SEFAZ', () => {
    const xml = envelopeRetorno(`
      <retConsSitNFe xmlns="http://www.portalfiscal.inf.br/nfe">
        <cStat>217</cStat><xMotivo>NF-e nao consta na base de dados da SEFAZ</xMotivo>
      </retConsSitNFe>`);

    const resultado = parseRetornoConsulta(xml);
    expect(resultado.situacao).toBe('INEXISTENTE');
    expect(resultado.protocolo).toBeNull();
  });

  it('falha quando a SEFAZ recusa a requisicao', () => {
    const xml = envelopeRetorno(`
      <retConsSitNFe xmlns="http://www.portalfiscal.inf.br/nfe">
        <cStat>226</cStat><xMotivo>Codigo da UF do Emitente diverge da UF autorizadora</xMotivo>
      </retConsSitNFe>`);

    expect(() => parseRetornoConsulta(xml)).toThrow('226');
  });

  it('falha quando o XML nao traz retConsSitNFe', () => {
    expect(() => parseRetornoConsulta('<html>erro 500</html>')).toThrow('inesperada');
  });
});
