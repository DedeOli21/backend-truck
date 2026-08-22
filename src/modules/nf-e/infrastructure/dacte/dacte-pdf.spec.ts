import { gerarDactePdf, DadosDacte } from '@nf-e/infrastructure/dacte/dacte-pdf.service';
import { writeFileSync } from 'fs';
import { logoEmitente } from '@nf-e/infrastructure/dacte/logo';

const dados: DadosDacte = {
  chave: '35260808789863000100570010000011471000000001',
  numero: 1147,
  serie: 1,
  cfop: '6353',
  naturezaOperacao: 'PRESTACAO DE SERVICO DE TRANSPORTE A ESTABELECIMENTO COMERCIAL',
  emitidoEm: '2026-08-21T18:13:25.000Z',
  emitente: {
    nome: 'J M DE OLIVEIRA - CARGAS - ME',
    cnpj: '08789863000100',
    ie: '125767078113',
    rntrc: '56299277',
    telefone: '(35) 99201-3225',
    logradouro: 'RUA GILSON NARDONI RODRIGUES 9',
    bairro: 'JARDIM BONANCA',
    cep: '06266-180',
    municipio: 'OSASCO',
    uf: 'SP',
    crt: '1',
  },
  remetente: {
    nome: 'MEIWA INDUSTRIA E COMERCIO LTDA',
    cnpjCpf: '55078307000105',
    ie: '188012385116',
    logradouro: 'RODOVIA PRESIDENTE DUTRA - 203,6',
    bairro: 'PORTAO',
    municipio: 'ARUJA',
    cep: '07400-000',
    uf: 'SP',
    fone: '',
  },
  destinatario: {
    nome: 'L&M PACK DISTRIBUIDORA LTDA',
    cnpjCpf: '18442358000130',
    ie: '0021801280096',
    logradouro: 'RUA DIAMANTE - 268',
    bairro: 'SAO JOAQUIM',
    municipio: 'CONTAGEM',
    cep: '32113-000',
    uf: 'MG',
    fone: '(31) 3362-7580',
  },
  tomador: {
    nome: 'L&M PACK DISTRIBUIDORA LTDA',
    cnpjCpf: '18442358000130',
    ie: '0021801280096',
    logradouro: 'RUA DIAMANTE - 268',
    bairro: 'SAO JOAQUIM',
    municipio: 'CONTAGEM',
    cep: '32113-000',
    uf: 'MG',
    fone: '(31) 3362-7580',
  },
  origem: 'SP - 3503901 - ARUJA',
  destino: 'MG - 3118601 - CONTAGEM',
  valorTotalServico: 4500,
  valorReceber: 4500,
  valorCarga: 39587.01,
  pesoBruto: 1397.55,
  produtoPredominante: 'RECIPIENTE/BANDEJA M-104 COM TAMPA COM 100 UNIDADES',
  quantidades: [
    { tipo: 'PESO BRUTO', quantidade: 1397.55, unidade: 'KG' },
    { tipo: 'PESO LIQUIDO', quantidade: 1397.55, unidade: 'KG' },
    { tipo: 'UNIDADE', quantidade: 686, unidade: 'UNIDADE' },
  ],
  componentes: [
    { nome: 'Frete peso', valor: 0 },
    { nome: 'Frete valor', valor: 4500 },
  ],
  notasFiscais: [
    { chave: '35260855078307000105550010013284551000107765', cnpj: '55078307000105', numero: 1328455, serie: 1 },
  ],
  protocolo: '135264179761055',
  autorizadoEm: '2026-08-21T18:13:30.000Z',
  observacoes: 'JM DE OLIVEIRA CARGAS ME - MEIWAL SP DESTINO L&M PACK 21/08/26.',
  logo: logoEmitente(),
};

test('gera PDF do DACTE com os dados do CT-e 1147', async () => {
  const pdf = await gerarDactePdf(dados);
  expect(pdf).toBeInstanceOf(Buffer);
  expect(pdf.length).toBeGreaterThan(1000);

  // Salva pra inspeção visual
  writeFileSync('/tmp/dacte-teste.pdf', pdf);
  console.log(`PDF gerado: ${pdf.length} bytes`);
}, 15000);

test('a logomarca do emitente está disponível como data URI JPEG', () => {
  expect(logoEmitente()).toMatch(/^data:image\/jpeg;base64,/);
});
