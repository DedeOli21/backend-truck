import { parseNfeXml } from '@nf-e/domain/value-objects/nfe-xml';

// NF-e 46452 (remessa de vasilhame) — assinatura e certificado removidos.
const XML_REMESSA = `<?xml version="1.0" encoding="UTF-8"?><nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><NFe><infNFe Id="NFe31260836547966000271550030000464521319720980" versao="4.00"><ide><cUF>31</cUF><cNF>31972098</cNF><natOp>REMESSA DE VASILHAME OU SACARIA</natOp><mod>55</mod><serie>3</serie><nNF>46452</nNF><dhEmi>2026-08-21T08:04:00-03:00</dhEmi><tpNF>1</tpNF><cDV>0</cDV></ide><emit><CNPJ>36547966000271</CNPJ><xNome>RAIZES INDUSTRIA E COMERCIO DE EMBALAGENS E SERVICOS LTDA</xNome><enderEmit><xMun>BETIM</xMun><UF>MG</UF></enderEmit></emit><dest><CNPJ>33000092003850</CNPJ><xNome>COSAN LUBRIFICANTES E ESPECIALIDADES S/A</xNome><enderDest><xMun>RIO DE JANEIRO</xMun><UF>RJ</UF></enderDest></dest><det nItem="1"><prod><cProd>40000021</cProd><xProd>PALLET DE MADEIRA                                  N/Ped: 028803/01</xProd><NCM>44152000</NCM><CFOP>6920</CFOP><uCom>PC</uCom><qCom>20.0000</qCom><vUnCom>34.47000000</vUnCom><vProd>689.40</vProd></prod></det><total><ICMSTot><vProd>689.40</vProd><vFrete>0</vFrete><vNF>689.40</vNF></ICMSTot></total><transp><modFrete>0</modFrete><transporta><CNPJ>08789863000100</CNPJ><xNome>J M DE OLIVEIRA - CARGAS</xNome><xMun>OSASCO</xMun><UF>SP</UF></transporta><vol><qVol>20</qVol><esp>PALLETS</esp></vol></transp><infAdic><infCpl>REFERE-SE A NF 46451</infCpl></infAdic></infNFe></NFe><protNFe versao="4.00"><infProt><chNFe>31260836547966000271550030000464521319720980</chNFe><dhRecbto>2026-08-21T08:05:13-03:00</dhRecbto><nProt>131267837206022</nProt><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo></infProt></protNFe></nfeProc>`;

// NF-e 46453 (venda), com peso, pedido e cobrança.
const XML_VENDA = `<?xml version="1.0" encoding="UTF-8"?><nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><NFe><infNFe Id="NFe31260836547966000271550030000464531126091791" versao="4.00"><ide><natOp>VENDA DE PRODUCAO DO ESTABELECIMENTO</natOp><mod>55</mod><serie>3</serie><nNF>46453</nNF><dhEmi>2026-08-21T08:08:00-03:00</dhEmi></ide><emit><CNPJ>36547966000271</CNPJ><xNome>RAIZES INDUSTRIA E COMERCIO DE EMBALAGENS E SERVICOS LTDA</xNome><enderEmit><xMun>BETIM</xMun><UF>MG</UF></enderEmit></emit><dest><CNPJ>33000092003850</CNPJ><xNome>COSAN LUBRIFICANTES E ESPECIALIDADES S/A</xNome><enderDest><xMun>RIO DE JANEIRO</xMun><UF>RJ</UF></enderDest></dest><det nItem="1"><prod><cProd>744500005</cProd><xProd>802291 LPAI 20L ALBJ V04 MOBIL PRETO :BR N/Ped: 028801/01</xProd><NCM>39233090</NCM><CFOP>6101</CFOP><uCom>MIL</uCom><qCom>2.0160</qCom><vUnCom>23179.40972222</vUnCom><vProd>46729.69</vProd></prod></det><total><ICMSTot><vProd>46729.69</vProd><vFrete>0</vFrete><vNF>51285.83</vNF></ICMSTot></total><transp><transporta><CNPJ>08789863000100</CNPJ><xNome>J M DE OLIVEIRA - CARGAS</xNome><xMun>OSASCO</xMun><UF>SP</UF></transporta><vol><qVol>18</qVol><esp>PALLETS</esp><pesoL>1995.840</pesoL><pesoB>2310.840</pesoB></vol></transp><compra><xPed>4510080431</xPed></compra><infNFe2/></infNFe></NFe><protNFe versao="4.00"><infProt><chNFe>31260836547966000271550030000464531126091791</chNFe><dhRecbto>2026-08-21T08:11:54-03:00</dhRecbto><nProt>131267837225967</nProt><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo></infProt></protNFe></nfeProc>`;

describe('parseNfeXml', () => {
  it('le identificacao e natureza da operacao', () => {
    const nfe = parseNfeXml(XML_REMESSA);

    expect(nfe.chave).toBe('31260836547966000271550030000464521319720980');
    expect(nfe.numero).toBe(46452);
    expect(nfe.serie).toBe(3);
    expect(nfe.modelo).toBe(55);
    expect(nfe.naturezaOperacao).toBe('REMESSA DE VASILHAME OU SACARIA');
    expect(nfe.emitidoEm).toBe('2026-08-21T08:04:00-03:00');
  });

  it('le emitente e destinatario com municipio e UF', () => {
    const nfe = parseNfeXml(XML_REMESSA);

    expect(nfe.emitente).toMatchObject({
      cnpjCpf: '36547966000271',
      municipio: 'BETIM',
      uf: 'MG',
    });
    expect(nfe.destinatario).toMatchObject({
      cnpjCpf: '33000092003850',
      municipio: 'RIO DE JANEIRO',
      uf: 'RJ',
    });
  });

  it('le o endereco completo, exigido para emitir o CT-e', () => {
    const nfe = parseNfeXml(XML_REMESSA);

    expect(nfe.emitente?.endereco).toMatchObject({
      municipio: 'BETIM',
      uf: 'MG',
    });
    expect(nfe.destinatario?.endereco.municipio).toBe('RIO DE JANEIRO');
  });

  it('le a transportadora, que e quem interessa para o frete', () => {
    const nfe = parseNfeXml(XML_REMESSA);

    expect(nfe.transportadora).toMatchObject({
      cnpjCpf: '08789863000100',
      nome: 'J M DE OLIVEIRA - CARGAS',
      uf: 'SP',
    });
  });

  it('le os itens e normaliza a descricao com espacos em excesso', () => {
    const nfe = parseNfeXml(XML_REMESSA);

    expect(nfe.itens).toHaveLength(1);
    expect(nfe.itens[0]).toMatchObject({
      codigo: '40000021',
      descricao: 'PALLET DE MADEIRA N/Ped: 028803/01',
      ncm: '44152000',
      cfop: '6920',
      unidade: 'PC',
      quantidade: 20,
      valor: 689.4,
    });
  });

  it('le totais e volumes', () => {
    const nfe = parseNfeXml(XML_REMESSA);

    expect(nfe.valorProdutos).toBe(689.4);
    expect(nfe.valorTotal).toBe(689.4);
    expect(nfe.volumes).toMatchObject({ quantidade: 20, especie: 'PALLETS' });
  });

  it('le o protocolo de autorizacao', () => {
    const nfe = parseNfeXml(XML_REMESSA);

    expect(nfe.protocolo).toBe('131267837206022');
    expect(nfe.situacao).toBe('AUTORIZADA');
    expect(nfe.autorizadoEm).toBe('2026-08-21T08:05:13-03:00');
  });

  it('le peso e pedido quando a nota traz', () => {
    const nfe = parseNfeXml(XML_VENDA);

    expect(nfe.numero).toBe(46453);
    expect(nfe.valorTotal).toBe(51285.83);
    expect(nfe.volumes).toMatchObject({ pesoLiquido: 1995.84, pesoBruto: 2310.84 });
    expect(nfe.pedido).toBe('4510080431');
  });

  it('recusa XML de CT-e apontando a rota certa', () => {
    const cte = `<cteProc><CTe><infCte Id="CTe35260808789863000100570010000011471000000001"></infCte></CTe></cteProc>`;
    expect(() => parseNfeXml(cte)).toThrow('infNFe');
  });

  it('recusa XML malformado', () => {
    expect(() => parseNfeXml('nao e xml nenhum')).toThrow();
  });
});
