import { DadosMdfe, gerarMdfeXml, montarChaveMdfe } from '@nf-e/domain/emissao/gerar-mdfe-xml';

const dados = (): DadosMdfe => ({
  ambiente: 2,
  serie: 1,
  numero: 15,
  codigoNumerico: 12345678,
  emitidoEm: new Date('2026-08-25T10:00:00.000Z'),
  ufIni: 'SP',
  ufFim: 'MG',
  ufPercurso: [],
  municipioCarregamento: { codigoMunicipio: '3550308', municipio: 'SAO PAULO' },
  municipioDescarga: { codigoMunicipio: '3106200', municipio: 'BELO HORIZONTE' },
  emitente: {
    cnpjCpf: '08789863000100',
    inscricaoEstadual: '123456789',
    nome: 'J M de Oliveira Cargas',
    endereco: {
      logradouro: 'RUA DAS FLORES',
      numero: '100',
      bairro: 'CENTRO',
      codigoMunicipio: '3550308',
      municipio: 'SAO PAULO',
      cep: '01000000',
      uf: 'SP',
    },
  },
  veiculo: {
    placa: 'ABC1D23',
    rntrc: '12345678',
    tara: 8000,
    capacidadeKg: 30000,
    uf: 'SP',
  },
  condutor: { nome: 'Jose da Silva', cpf: '12345678909' },
  cteChaves: [
    '35260808789863000100570010000011471000000001',
    '35260808789863000100570010000011481000000002',
  ],
  totais: { valorCarga: 39587.01, pesoBrutoKg: 1397.55 },
  seguro: {
    responsavel: 1,
    seguradoraNome: 'Seguradora Exemplo',
    seguradoraCnpj: '11222333000181',
    apolice: '000123456',
  },
});

describe('gerarMdfeXml', () => {
  it('monta a chave com modelo 58 e 44 dígitos', () => {
    const chave = montarChaveMdfe(dados());

    expect(chave).toHaveLength(44);
    expect(chave.slice(20, 22)).toBe('58');
  });

  it('gera o XML com os dados do veículo, condutor e CT-es vinculados', () => {
    const { xml, chave, id } = gerarMdfeXml(dados());

    expect(id).toBe(`MDFe${chave}`);
    expect(xml).toContain(`Id="${id}"`);
    expect(xml).toContain('<mod>58</mod>');
    expect(xml).toContain('<modal>1</modal>');
    expect(xml).toContain('<placa>ABC1D23</placa>');
    expect(xml).toContain('<RNTRC>12345678</RNTRC>');
    expect(xml).toContain('<CPF>12345678909</CPF>');
    expect(xml).toContain(
      '<infCTe><chCTe>35260808789863000100570010000011471000000001</chCTe></infCTe>',
    );
    expect(xml).toContain(
      '<infCTe><chCTe>35260808789863000100570010000011481000000002</chCTe></infCTe>',
    );
    expect(xml).toContain('<qCTe>2</qCTe>');
    expect(xml).toContain('<vCarga>39587.01</vCarga>');
    expect(xml).toContain('<UFIni>SP</UFIni>');
    expect(xml).toContain('<UFFim>MG</UFFim>');
    expect(xml).toContain('<xSeg>Seguradora Exemplo</xSeg>');
    expect(xml).toContain('<CNPJ>11222333000181</CNPJ>');
    expect(xml).toContain('<nApol>000123456</nApol>');
  });

  it('inclui infPercurso quando a viagem passa por UF intermediária', () => {
    const { xml } = gerarMdfeXml({ ...dados(), ufPercurso: ['RJ'] });

    expect(xml).toContain('<infPercurso><UFPer>RJ</UFPer></infPercurso>');
  });

  it('não inclui infPercurso quando não há UF intermediária', () => {
    const { xml } = gerarMdfeXml(dados());

    expect(xml).not.toContain('infPercurso');
  });

  it('escapa nomes com caracteres especiais de XML', () => {
    const { xml } = gerarMdfeXml({
      ...dados(),
      emitente: { ...dados().emitente, nome: 'J&M "Cargas" <Transporte>' },
    });

    expect(xml).toContain('J&amp;M &quot;Cargas&quot; &lt;Transporte&gt;');
  });
});
