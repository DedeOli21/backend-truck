import {
  montarCteProc,
  montarEnvelopeRecepcao,
  parseRetornoRecepcao,
} from '@nf-e/infrastructure/sefaz/recepcao-cte';

const CHAVE = '35260808789863000100570010000011471000000001';
const CTE = `<?xml version="1.0" encoding="UTF-8"?><CTe xmlns="http://www.portalfiscal.inf.br/cte"><infCte Id="CTe${CHAVE}"></infCte><Signature></Signature></CTe>`;

const resposta = (miolo: string) =>
  `<soap:Envelope><soap:Body><cteRecepcaoSincResult xmlns="http://www.portalfiscal.inf.br/cte/wsdl/CTeRecepcaoSincV4">${miolo}</cteRecepcaoSincResult></soap:Body></soap:Envelope>`;

describe('montarEnvelopeRecepcao', () => {
  it('embrulha o CT-e sem repetir a declaracao xml', () => {
    const envelope = montarEnvelopeRecepcao(CTE, 2);

    expect(envelope).toContain('cteDadosMsg');
    expect(envelope).toContain('CTeRecepcaoSincV4');
    expect(envelope.match(/<\?xml/g)).toHaveLength(1);
  });
});

describe('parseRetornoRecepcao', () => {
  const autorizada = resposta(`
    <retCTe xmlns="http://www.portalfiscal.inf.br/cte" versao="4.00">
      <tpAmb>2</tpAmb><cStat>100</cStat><xMotivo>Autorizado o uso do CT-e</xMotivo>
      <protCTe versao="4.00"><infProt><chCTe>${CHAVE}</chCTe><dhRecbto>2026-08-22T10:00:00-03:00</dhRecbto><nProt>135260000999888</nProt><cStat>100</cStat><xMotivo>Autorizado o uso do CT-e</xMotivo></infProt></protCTe>
    </retCTe>`);

  it('reconhece autorizacao e devolve o protocolo', () => {
    const retorno = parseRetornoRecepcao(autorizada);

    expect(retorno.autorizado).toBe(true);
    expect(retorno.protocolo).toBe('135260000999888');
    expect(retorno.chave).toBe(CHAVE);
    expect(retorno.situacao).toBe('AUTORIZADA');
    expect(retorno.protocoloXml).toContain('<protCTe');
  });

  it('reconhece rejeicao com o motivo da SEFAZ', () => {
    const rejeitada = resposta(`
      <retCTe xmlns="http://www.portalfiscal.inf.br/cte">
        <cStat>539</cStat><xMotivo>Rejeicao: Duplicidade de CT-e</xMotivo>
      </retCTe>`);

    const retorno = parseRetornoRecepcao(rejeitada);

    expect(retorno.autorizado).toBe(false);
    expect(retorno.codigoStatus).toBe(539);
    expect(retorno.motivo).toContain('Duplicidade');
    expect(retorno.protocolo).toBeNull();
  });

  it('aceita autorizacao fora do prazo (150)', () => {
    const fora = resposta(`
      <retCTe><cStat>150</cStat><xMotivo>Autorizado fora de prazo</xMotivo>
      <protCTe><infProt><cStat>150</cStat><nProt>1</nProt></infProt></protCTe></retCTe>`);

    expect(parseRetornoRecepcao(fora).autorizado).toBe(true);
  });

  it('falha quando a SEFAZ devolve algo inesperado', () => {
    expect(() => parseRetornoRecepcao('<html>502</html>')).toThrow('retCTe');
  });
});

describe('montarCteProc', () => {
  it('junta CT-e e protocolo no arquivo final', () => {
    const proc = montarCteProc(CTE, '<protCTe><infProt><nProt>1</nProt></infProt></protCTe>');

    expect(proc).toContain('<cteProc');
    expect(proc).toContain('<CTe');
    expect(proc).toContain('<protCTe>');
    expect(proc.match(/<\?xml/g)).toHaveLength(1);
  });
});
