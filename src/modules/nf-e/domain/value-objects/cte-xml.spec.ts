import { parseCteXml } from '@nf-e/domain/value-objects/cte-xml';

// Estrutura de um cteProc real, com os valores do DACTE 1147 usado como exemplo.
const XML = `<?xml version="1.0" encoding="UTF-8"?>
<cteProc xmlns="http://www.portalfiscal.inf.br/cte" versao="4.00">
  <CTe>
    <infCte versao="4.00" Id="CTe35260808789863000100570010000011471000000001">
      <ide>
        <cUF>35</cUF><cCT>10000000</cCT><CFOP>6353</CFOP>
        <natOp>PRESTACAO DE SERVICO DE TRANSPORTE A ESTABELECIMENTO COMERCI</natOp>
        <mod>57</mod><serie>1</serie><nCT>1147</nCT>
        <dhEmi>2026-08-21T15:13:25-03:00</dhEmi>
        <tpImp>1</tpImp><tpEmis>1</tpEmis><tpCTe>0</tpCTe>
        <cMunIni>3503901</cMunIni><xMunIni>ARUJA</xMunIni><UFIni>SP</UFIni>
        <cMunFim>3118601</cMunFim><xMunFim>CONTAGEM</xMunFim><UFFim>MG</UFFim>
      </ide>
      <emit>
        <CNPJ>08789863000100</CNPJ><IE>125767078113</IE>
        <xNome>J m de oliveira - cargas - me</xNome>
      </emit>
      <rem>
        <CNPJ>55078307000105</CNPJ>
        <xNome>MEIWA INDUSTRIA E COMERCIO LTDA</xNome>
        <enderReme><xMun>ARUJA</xMun><UF>SP</UF></enderReme>
      </rem>
      <dest>
        <CNPJ>18442358000130</CNPJ>
        <xNome>L&amp;M PACK DISTRIBUIDORA LTDA</xNome>
        <enderDest><xMun>CONTAGEM</xMun><UF>MG</UF></enderDest>
      </dest>
      <vPrest>
        <vTPrest>4500.00</vTPrest><vRec>4500.00</vRec>
        <Comp><xNome>Frete peso</xNome><vComp>0.00</vComp></Comp>
        <Comp><xNome>Frete valor</xNome><vComp>4500.00</vComp></Comp>
      </vPrest>
      <infCTeNorm>
        <infCarga>
          <vCarga>39587.01</vCarga>
          <proPred>RECIPIENTE/BANDEJA M-104 COM TAMPA COM 100 UNIDADES</proPred>
          <infQ><cUnid>01</cUnid><tpMed>PESO BRUTO</tpMed><qCarga>1397.5500</qCarga></infQ>
          <infQ><cUnid>03</cUnid><tpMed>UNIDADE</tpMed><qCarga>686.0000</qCarga></infQ>
        </infCarga>
        <infDoc>
          <infNFe><chave>35260855078307000105550010013284551000107765</chave></infNFe>
        </infDoc>
        <infModal><rodo><RNTRC>56299277</RNTRC></rodo></infModal>
      </infCTeNorm>
    </infCte>
  </CTe>
  <protCTe versao="4.00">
    <infProt>
      <chCTe>35260808789863000100570010000011471000000001</chCTe>
      <dhRecbto>2026-08-21T15:13:30-03:00</dhRecbto>
      <nProt>135264179761055</nProt>
      <cStat>100</cStat><xMotivo>Autorizado o uso do CT-e</xMotivo>
    </infProt>
  </protCTe>
</cteProc>`;

describe('parseCteXml', () => {
  it('extrai identificacao e trajeto', () => {
    const cte = parseCteXml(XML);

    expect(cte.chave).toBe('35260808789863000100570010000011471000000001');
    expect(cte.numero).toBe(1147);
    expect(cte.serie).toBe(1);
    expect(cte.cfop).toBe('6353');
    expect(cte.emitidoEm).toBe('2026-08-21T15:13:25-03:00');
    expect(cte.origem).toEqual({ municipio: 'ARUJA', uf: 'SP' });
    expect(cte.destino).toEqual({ municipio: 'CONTAGEM', uf: 'MG' });
  });

  it('extrai emitente, remetente e destinatario', () => {
    const cte = parseCteXml(XML);

    expect(cte.emitente).toEqual({ cnpjCpf: '08789863000100', nome: 'J m de oliveira - cargas - me' });
    expect(cte.remetente?.cnpjCpf).toBe('55078307000105');
    expect(cte.destinatario?.nome).toBe('L&M PACK DISTRIBUIDORA LTDA');
  });

  it('extrai valores da prestacao com os componentes', () => {
    const cte = parseCteXml(XML);

    expect(cte.valorTotal).toBe(4500);
    expect(cte.valorReceber).toBe(4500);
    expect(cte.componentes).toEqual([
      { nome: 'Frete peso', valor: 0 },
      { nome: 'Frete valor', valor: 4500 },
    ]);
  });

  it('extrai carga, peso e produto predominante', () => {
    const cte = parseCteXml(XML);

    expect(cte.valorCarga).toBe(39587.01);
    expect(cte.produtoPredominante).toContain('RECIPIENTE/BANDEJA');
    expect(cte.quantidades).toEqual([
      { tipo: 'PESO BRUTO', quantidade: 1397.55 },
      { tipo: 'UNIDADE', quantidade: 686 },
    ]);
  });

  it('extrai as NF-e transportadas e o RNTRC', () => {
    const cte = parseCteXml(XML);

    expect(cte.notasFiscais).toEqual(['35260855078307000105550010013284551000107765']);
    expect(cte.rntrc).toBe('56299277');
  });

  it('extrai o protocolo de autorizacao', () => {
    const cte = parseCteXml(XML);

    expect(cte.protocolo).toBe('135264179761055');
    expect(cte.autorizadoEm).toBe('2026-08-21T15:13:30-03:00');
    expect(cte.situacao).toBe('AUTORIZADA');
  });

  it('aceita XML sem o envelope cteProc, sem protocolo', () => {
    const semProc = XML.replace(/<\?xml[^>]*\?>/, '')
      .replace(/<cteProc[^>]*>/, '')
      .replace(/<protCTe[\s\S]*<\/protCTe>/, '')
      .replace('</cteProc>', '');

    const cte = parseCteXml(semProc);

    expect(cte.numero).toBe(1147);
    expect(cte.protocolo).toBeNull();
    expect(cte.situacao).toBeNull();
  });

  it('recusa XML que nao e de CT-e', () => {
    expect(() => parseCteXml('<nfeProc><NFe></NFe></nfeProc>')).toThrow('CT-e');
  });

  it('recusa XML malformado', () => {
    expect(() => parseCteXml('isso nao e xml')).toThrow();
  });
});
