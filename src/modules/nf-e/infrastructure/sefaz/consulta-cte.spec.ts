import {
  montarEnvelopeConsultaCte,
  parseRetornoConsultaCte,
} from '@nf-e/infrastructure/sefaz/consulta-cte';

const CHAVE = '35260811222333000181570010000010421123456780';

const envelope = (miolo: string) => `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <cteConsultaCTResult xmlns="http://www.portalfiscal.inf.br/cte/wsdl/CTeConsultaV4">
      ${miolo}
    </cteConsultaCTResult>
  </soap:Body>
</soap:Envelope>`;

describe('montarEnvelopeConsultaCte', () => {
  it('usa o namespace e a tag do CT-e', () => {
    const xml = montarEnvelopeConsultaCte(CHAVE, 1);

    expect(xml).toContain('consSitCTe');
    expect(xml).toContain('http://www.portalfiscal.inf.br/cte');
    expect(xml).toContain(`<chCTe>${CHAVE}</chCTe>`);
    expect(xml).toContain('<tpAmb>1</tpAmb>');
    expect(xml).not.toContain('chNFe');
  });
});

describe('parseRetornoConsultaCte', () => {
  it('le CT-e autorizado', () => {
    const xml = envelope(`
      <retConsSitCTe xmlns="http://www.portalfiscal.inf.br/cte" versao="4.00">
        <cStat>100</cStat>
        <xMotivo>Autorizado o uso do CT-e</xMotivo>
        <protCTe versao="4.00">
          <infProt>
            <chCTe>${CHAVE}</chCTe>
            <dhRecbto>2026-08-10T12:00:00-03:00</dhRecbto>
            <nProt>135260000123456</nProt>
            <cStat>100</cStat>
          </infProt>
        </protCTe>
      </retConsSitCTe>`);

    const resultado = parseRetornoConsultaCte(xml);

    expect(resultado.situacao).toBe('AUTORIZADA');
    expect(resultado.protocolo).toBe('135260000123456');
    expect(resultado.dataAutorizacao).toBe('2026-08-10T12:00:00-03:00');
  });

  it('le CT-e cancelado', () => {
    const xml = envelope(`
      <retConsSitCTe xmlns="http://www.portalfiscal.inf.br/cte">
        <cStat>101</cStat><xMotivo>Cancelamento de CT-e homologado</xMotivo>
      </retConsSitCTe>`);

    expect(parseRetornoConsultaCte(xml).situacao).toBe('CANCELADA');
  });

  it('le CT-e inexistente', () => {
    const xml = envelope(`
      <retConsSitCTe xmlns="http://www.portalfiscal.inf.br/cte">
        <cStat>217</cStat><xMotivo>CT-e nao consta na base de dados da SEFAZ</xMotivo>
      </retConsSitCTe>`);

    expect(parseRetornoConsultaCte(xml).situacao).toBe('INEXISTENTE');
  });

  it('falha quando a SEFAZ recusa a consulta', () => {
    const xml = envelope(`
      <retConsSitCTe xmlns="http://www.portalfiscal.inf.br/cte">
        <cStat>236</cStat><xMotivo>Chave de Acesso com digito verificador invalido</xMotivo>
      </retConsSitCTe>`);

    expect(() => parseRetornoConsultaCte(xml)).toThrow('236');
  });

  it('falha quando o XML nao traz retConsSitCTe', () => {
    expect(() => parseRetornoConsultaCte('<html>erro</html>')).toThrow('inesperada');
  });
});
