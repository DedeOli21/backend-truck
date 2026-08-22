import { parseChaveAcesso } from '@nf-e/domain/value-objects/chave-acesso';
import {
  DadosCte,
  RAZAO_SOCIAL_HOMOLOGACAO,
  gerarCteXml,
  montarChaveCte,
} from '@nf-e/domain/emissao/gerar-cte-xml';

// Reproduz o CT-e 1147 do DACTE de exemplo.
const dados = (): DadosCte => ({
  ambiente: 2,
  serie: 1,
  numero: 1147,
  codigoNumerico: 12345678,
  emitidoEm: new Date('2026-08-21T18:13:25.000Z'),
  cfop: '6353',
  naturezaOperacao: 'PRESTACAO DE SERVICO DE TRANSPORTE',
  tomador: 3,
  inicio: { codigoMunicipio: '3503901', municipio: 'ARUJA', uf: 'SP' },
  fim: { codigoMunicipio: '3118601', municipio: 'CONTAGEM', uf: 'MG' },
  emitente: {
    cnpjCpf: '08789863000100',
    inscricaoEstadual: '125767078113',
    nome: 'J M DE OLIVEIRA - CARGAS',
    crt: 1,
    rntrc: '56299277',
    endereco: {
      logradouro: 'RUA GILSON NARDONI RODRIGUES',
      numero: '9',
      bairro: 'JARDIM BONANCA',
      codigoMunicipio: '3534401',
      municipio: 'OSASCO',
      cep: '06266180',
      uf: 'SP',
    },
  },
  remetente: {
    cnpjCpf: '55078307000105',
    inscricaoEstadual: '188012385116',
    nome: 'MEIWA INDUSTRIA E COMERCIO LTDA',
    endereco: {
      logradouro: 'RODOVIA PRESIDENTE DUTRA',
      numero: '203',
      bairro: 'PORTAO',
      codigoMunicipio: '3503901',
      municipio: 'ARUJA',
      cep: '07400000',
      uf: 'SP',
    },
  },
  destinatario: {
    cnpjCpf: '18442358000130',
    inscricaoEstadual: '0021801280096',
    nome: 'L&M PACK DISTRIBUIDORA LTDA',
    endereco: {
      logradouro: 'RUA DIAMANTE',
      numero: '268',
      bairro: 'SAO JOAQUIM',
      codigoMunicipio: '3118601',
      municipio: 'CONTAGEM',
      cep: '32113000',
      uf: 'MG',
    },
  },
  valorTotal: 4500,
  valorReceber: 4500,
  componentes: [
    { nome: 'Frete peso', valor: 0 },
    { nome: 'Frete valor', valor: 4500 },
  ],
  valorCarga: 39587.01,
  produtoPredominante: 'RECIPIENTE/BANDEJA M-104',
  pesoBruto: 1397.55,
  notas: [{ chave: '35260855078307000105550010013284551000107765' }],
});

describe('montarChaveCte', () => {
  it('gera chave valida, com DV que fecha', () => {
    const chave = montarChaveCte(dados());
    const lida = parseChaveAcesso(chave);

    expect(lida.uf).toBe('SP');
    expect(lida.modelo).toBe(57);
    expect(lida.tipoDocumento).toBe('CTE');
    expect(lida.serie).toBe(1);
    expect(lida.numero).toBe(1147);
    expect(lida.cnpjEmitente).toBe('08789863000100');
  });

  it('numero e serie diferentes geram chaves diferentes', () => {
    const a = montarChaveCte(dados());
    const b = montarChaveCte({ ...dados(), numero: 1148 });

    expect(a).not.toBe(b);
  });
});

describe('gerarCteXml', () => {
  const { xml, chave, id } = gerarCteXml(dados());

  it('usa o Id no formato CTe+chave, que a assinatura referencia', () => {
    expect(id).toBe(`CTe${chave}`);
    expect(xml).toContain(`Id="${id}"`);
    expect(xml).toContain('versao="4.00"');
  });

  it('declara o namespace do portal fiscal', () => {
    expect(xml).toContain('xmlns="http://www.portalfiscal.inf.br/cte"');
  });

  it('respeita o ambiente pedido', () => {
    expect(xml).toContain('<tpAmb>2</tpAmb>');
    expect(gerarCteXml({ ...dados(), ambiente: 1 }).xml).toContain('<tpAmb>1</tpAmb>');
  });

  it('marca modal rodoviario e o RNTRC do emitente', () => {
    expect(xml).toContain('<modal>01</modal>');
    expect(xml).toContain('<RNTRC>56299277</RNTRC>');
  });

  it('leva o trajeto com codigo IBGE dos municipios', () => {
    expect(xml).toContain('<cMunIni>3503901</cMunIni><xMunIni>ARUJA</xMunIni><UFIni>SP</UFIni>');
    expect(xml).toContain('<cMunFim>3118601</cMunFim><xMunFim>CONTAGEM</xMunFim><UFFim>MG</UFFim>');
  });

  it('leva valores da prestacao com duas casas', () => {
    expect(xml).toContain('<vTPrest>4500.00</vTPrest>');
    expect(xml).toContain('<vRec>4500.00</vRec>');
    expect(xml).toContain('<Comp><xNome>Frete valor</xNome><vComp>4500.00</vComp></Comp>');
  });

  it('leva a carga, o peso e a NF-e transportada', () => {
    expect(xml).toContain('<vCarga>39587.01</vCarga>');
    expect(xml).toContain('<qCarga>1397.5500</qCarga>');
    expect(xml).toContain('<chave>35260855078307000105550010013284551000107765</chave>');
  });

  it('usa ICMS do Simples Nacional quando o CRT e 1', () => {
    expect(xml).toContain('<ICMSSN><CST>90</CST><indSN>1</indSN></ICMSSN>');
  });

  it('usa ICMS normal quando o CRT e 3', () => {
    const normal = gerarCteXml({
      ...dados(),
      emitente: { ...dados().emitente, crt: 3 },
    }).xml;

    expect(normal).toContain('<ICMS00>');
    expect(normal).toContain('<vICMS>540.00</vICMS>');
  });

  it('escapa caracteres especiais da razao social', () => {
    expect(xml).toContain('L&amp;M PACK DISTRIBUIDORA LTDA');
    expect(xml).not.toContain('L&M PACK');
  });

  it('usa a razao social exigida em homologacao no remetente', () => {
    // Sem isso a SEFAZ rejeita com cStat 646.
    expect(xml).toContain(RAZAO_SOCIAL_HOMOLOGACAO);
    expect(xml).not.toContain('MEIWA INDUSTRIA E COMERCIO LTDA');
  });

  it('mantem a razao social real em producao', () => {
    const producao = gerarCteXml({ ...dados(), ambiente: 1 }).xml;

    expect(producao).toContain('MEIWA INDUSTRIA E COMERCIO LTDA');
    expect(producao).not.toContain(RAZAO_SOCIAL_HOMOLOGACAO);
  });

  it('recusa UF de emitente invalida', () => {
    const invalido = dados();
    invalido.emitente.endereco.uf = 'XX';

    expect(() => gerarCteXml(invalido)).toThrow('UF');
  });
});
