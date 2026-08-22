// pdfmake 0.3+ no Node.js: usa o build de browser com addVirtualFileSystem.
// getBuffer() retorna Promise<Buffer> nesta versão.
const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');
pdfMake.addVirtualFileSystem(pdfFonts);

// --------------- Formatação ---------------

const fmtBr = (n: number, decimais = 2) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: decimais, maximumFractionDigits: decimais });

const fmtCnpj = (cnpj: string) =>
  cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');

const fmtChave = (chave: string) => chave.match(/.{4}/g)?.join('.') ?? chave;

const fmtData = (isoDate: string) => {
  const d = new Date(isoDate);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} GMT-03:00`;
};

const fmtDataCurta = (isoDate: string) => {
  const d = new Date(isoDate);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

// --------------- Tipos ---------------

export interface DadosDacte {
  chave: string;
  numero: number;
  serie: number;
  cfop: string;
  naturezaOperacao: string;
  emitidoEm: string;
  emitente: {
    nome: string; cnpj: string; ie: string; rntrc: string; telefone: string;
    logradouro: string; bairro: string; cep: string; municipio: string; uf: string;
    crt: '1' | '2' | '3';
  };
  remetente: { nome: string; cnpjCpf: string; ie: string; logradouro: string; bairro: string; municipio: string; cep: string; uf: string; fone: string };
  destinatario: { nome: string; cnpjCpf: string; ie: string; logradouro: string; bairro: string; municipio: string; cep: string; uf: string; fone: string };
  tomador: { nome: string; cnpjCpf: string; ie: string; logradouro: string; bairro: string; municipio: string; cep: string; uf: string; fone: string };
  origem: string;
  destino: string;
  valorTotalServico: number;
  valorReceber: number;
  valorCarga: number;
  pesoBruto: number;
  produtoPredominante: string;
  quantidades: { tipo: string; quantidade: number; unidade: string }[];
  componentes: { nome: string; valor: number }[];
  notasFiscais: { chave: string; cnpj: string; numero: number; serie: number }[];
  protocolo: string;
  autorizadoEm: string;
  observacoes: string;
}

// --------------- Estilos ---------------

const R = { fontSize: 5.5, color: '#555' };
const N = { fontSize: 6.5 };
const N7 = { fontSize: 7 };
const B7 = { fontSize: 7, bold: true };
const B8 = { fontSize: 8, bold: true };
const B9 = { fontSize: 9, bold: true };
const B12 = { fontSize: 12, bold: true };
const B18 = { fontSize: 18, bold: true };
const P = { fontSize: 5 };

// --------------- Blocos ---------------

function blocoRecibo() {
  const linha = (txt: string) => [
    { text: txt, ...R },
    { canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: 280, y2: 0, lineWidth: 0.5, lineColor: '#888' }] },
  ];

  return {
    stack: [
      { text: 'DECLARO QUE RECEBI OS VOLUMES DESTE CONHECIMENTO EM PERFEITO ESTADO PELO QUE DOU POR CUMPRIDO O PRESENTE CONTRATO DE TRANSPORTE', ...P, alignment: 'center' },
      { text: ' ', ...P },
      { text: ' ', ...P },
      ...linha('NOME'),
      ...linha('RG'),
      ...linha('ASSINATURA / CARIMBO'),
      { text: ' ', ...P },
      ...linha('TÉRMINO DA PRESTAÇÃO - DATA / HORA'),
      ...linha('INÍCIO DE PRESTAÇÃO - DATA / HORA'),
      { text: ' ', ...P },
      ...linha('ASSINATURA / CARIMBO'),
      ...linha('DATA'),
    ],
    margin: [0, 0, 2, 0],
    border: [true, true, true, true],
    padding: 4,
  };
}

function blocoCabecalho(dados: DadosDacte) {
  return {
    table: {
      widths: ['*', 'auto'],
      body: [[
        {
          text: [
            { text: 'DACTE\n', ...B18 },
            { text: 'DOCUMENTO AUXILIAR DO\nCONHECIMENTO DE TRANSPORTE ELETRÔNICO', ...B7 },
          ],
          alignment: 'center',
        },
        {
          stack: [
            { text: 'CTE', ...B9, alignment: 'center' },
            { text: 'NRO. DOCUMENTO', ...R, alignment: 'center' },
            { text: String(dados.numero), ...B8, alignment: 'center' },
            { text: 'SÉRIE', ...R, alignment: 'center' },
            { text: String(dados.serie), ...B8, alignment: 'center' },
          ],
          margin: [5, 2, 0, 0],
        },
      ]],
    },
    layout: 'noBorders',
    margin: [2, 0, 0, 2],
  };
}

function blocoEmitente(dados: DadosDacte) {
  const end = [dados.emitente.logradouro, dados.emitente.bairro].filter(Boolean).join(' - ');
  return {
    stack: [
      { text: dados.emitente.nome.toUpperCase(), ...B7, margin: [0, 0, 0, 1] },
      { text: end, ...N },
      { text: dados.emitente.cep, ...N },
      { text: `${dados.emitente.municipio} - ${dados.emitente.uf}`, ...N },
      { text: `CNPJ:${fmtCnpj(dados.emitente.cnpj)} IE:${dados.emitente.ie}`, ...N },
      { text: `RNTRC:${dados.emitente.rntrc} TELEFONE:${dados.emitente.telefone}`, ...N },
    ],
    margin: [2, 2, 2, 2],
    border: [true, true, true, true],
  };
}

function blocoInfoGerais(dados: DadosDacte) {
  const row = (label: string, value: string, valueStyle = N7) => [
    { text: label, ...R },
    { text: value, ...valueStyle, alignment: 'right' },
  ];

  return {
    table: {
      widths: ['auto', '*'],
      body: [
        row('MODAL', 'RODOVIÁRIO', B7),
        row('CTE GLOBALIZADO', 'NÃO', B7),
        row('TIPO DO CTE', 'NORMAL', B7),
        row('TIPO DO SERVIÇO', 'NORMAL', B7),
        row('MODELO', '57', N),
        row('SÉRIE', String(dados.serie), N),
        row('NÚMERO', String(dados.numero), N),
        row('PÁGINA', '1 / 1', N),
        [{ text: 'DATA E HORA DE EMISSÃO', ...R }, { text: fmtData(dados.emitidoEm), fontSize: 6, alignment: 'right' }],
        row('INSC. SUFRAMA', ' '),
        [{ text: 'Consulta em www.cte.fazenda.gov.br/portal', ...P, alignment: 'center', colSpan: 2 }, {}],
      ],
    },
    layout: 'noBorders',
    margin: [5, 2, 2, 2],
    border: [true, true, true, true],
  };
}

function blocoTrajeto(dados: DadosDacte) {
  return {
    stack: [
      { text: 'INÍCIO DA PRESTAÇÃO', ...R },
      { text: dados.origem, ...B7 },
      { text: ' ', ...P },
      { text: 'TÉRMINO DA PRESTAÇÃO', ...R },
      { text: dados.destino, ...B7 },
    ],
    border: [true, true, true, true],
    padding: 3,
    margin: [2, 0, 2, 0],
  };
}

function blocoProtocolo(dados: DadosDacte) {
  return {
    table: {
      widths: ['*', 'auto'],
      body: [[
        {
          stack: [
            { text: 'PROTOCOLO DE AUTORIZAÇÃO DE USO', ...R },
            { text: `${dados.protocolo}  ${fmtDataCurta(dados.autorizadoEm)}`, ...B7 },
          ],
        },
        {
          stack: [
            { text: 'CFOP - NATUREZA DA PRESTAÇÃO', ...R, alignment: 'right' },
            { text: `${dados.cfop} - ${dados.naturezaOperacao.toUpperCase()}`, ...B7, alignment: 'right' },
          ],
        },
      ]],
    },
    layout: 'noBorders',
    border: [true, true, true, true],
    padding: 3,
    margin: [2, 0, 2, 0],
  };
}

function blocoParticipante(rotulo: string, dados: any) {
  const doc = dados.cnpjCpf ?? dados.cnpj ?? '';
  return {
    stack: [
      { text: `${rotulo}: ${dados.nome}`, ...N },
      { text: `ENDEREÇO: ${dados.logradouro} - ${dados.bairro}`, ...N },
      { text: `MUNICIPIO: ${dados.municipio} CEP: ${dados.cep}`, ...N },
      { text: `CNPJ/CPF: ${doc} INSCRIÇÃO ESTADUAL: ${dados.ie}`, ...N },
      { text: `UF: ${dados.uf} PAÍS: BRASIL FONE: ${dados.fone ?? ''}`, ...N },
    ],
    margin: [2, 2, 2, 2],
  };
}

function blocoCarga(dados: DadosDacte) {
  const qtds = dados.quantidades.length
    ? dados.quantidades
    : [{ tipo: 'PESO BRUTO', quantidade: dados.pesoBruto, unidade: 'KG' }];

  return [
    { text: 'PRODUTO PREDOMINANTE', ...R },
    { text: dados.produtoPredominante, ...N },
    { text: 'OUTRAS CARACTERÍSTICAS DA CARGA', ...R },
    { text: ' ', ...P },
    { text: 'VALOR TOTAL DA MERCADORIA', ...R },
    { text: `R$ ${fmtBr(dados.valorCarga)}`, ...B7 },
    {
      table: {
        widths: ['*', 'auto', 'auto'],
        body: [
          [
            { text: 'QUANTIDADE', ...R },
            { text: 'CARGA', ...R, alignment: 'right' },
            { text: 'UNIDADE', ...R, alignment: 'center' },
          ],
          ...qtds.map(q => [
            { text: q.tipo, ...N },
            { text: fmtBr(q.quantidade, 4), ...N, alignment: 'right' },
            { text: q.unidade, ...N, alignment: 'center' },
          ]),
        ],
      },
      layout: 'noBorders',
    },
  ];
}

function blocoComponentes(dados: DadosDacte) {
  return {
    stack: [
      { text: 'COMPONENTES DO VALOR DA PRESTAÇÃO DE SERVIÇO', ...R, margin: [2, 2, 0, 2] },
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [{ text: 'NOME', ...R }, { text: 'VALOR', ...R, alignment: 'right' }],
            ...dados.componentes.map(c => [
              { text: c.nome, ...N },
              { text: fmtBr(c.valor), ...N, alignment: 'right' },
            ]),
          ],
        },
        layout: 'noBorders',
        margin: [2, 0, 2, 0],
      },
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [
              { text: 'VALOR TOTAL DO SERVIÇO', ...B7, alignment: 'right' },
              { text: `R$ ${fmtBr(dados.valorTotalServico)}`, ...B9, alignment: 'right' },
            ],
            [
              { text: 'VALOR A RECEBER', ...B7, alignment: 'right' },
              { text: `R$ ${fmtBr(dados.valorReceber)}`, ...B9, alignment: 'right' },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [2, 5, 2, 2],
      },
    ],
    border: [true, true, true, true],
    margin: [2, 0, 2, 0],
  };
}

function blocoImposto(dados: DadosDacte) {
  const normal = dados.emitente.crt === '3';
  return {
    stack: [
      { text: 'INFORMAÇÕES RELATIVAS AO IMPOSTO', ...R, margin: [2, 2, 0, 2] },
      { text: 'CLASSIFICAÇÃO TRIBUTÁRIA DO SERVIÇO', ...R, margin: [2, 0, 0, 1] },
      { text: normal ? '00 - Tributação normal' : '90 - Simples Nacional', ...N, margin: [2, 0, 0, 3] },
      {
        table: {
          widths: ['*', 'auto', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'BASE DE CÁLCULO', ...R, alignment: 'center' },
              { text: 'ALÍQ. ICMS', ...R, alignment: 'center' },
              { text: 'VALOR ICMS', ...R, alignment: 'center' },
              { text: '% RED. BC.', ...R, alignment: 'center' },
              { text: 'V. CRÉDITO', ...R, alignment: 'center' },
            ],
            [
              { text: normal ? fmtBr(dados.valorTotalServico) : '0,00', ...N, alignment: 'center' },
              { text: normal ? '12,00' : '0,00', ...N, alignment: 'center' },
              { text: normal ? fmtBr(dados.valorTotalServico * 0.12) : '0,00', ...N, alignment: 'center' },
              { text: '0,00', ...N, alignment: 'center' },
              { text: '0,00', ...N, alignment: 'center' },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [2, 0, 2, 2],
      },
    ],
    border: [true, true, true, true],
    margin: [2, 0, 2, 0],
  };
}

function blocoNotasFiscais(dados: DadosDacte) {
  if (!dados.notasFiscais.length) return { text: ' ', ...P };

  return {
    table: {
      widths: ['auto', '*', 'auto', '*'],
      body: [
        [
          { text: 'TP DOC.', ...R },
          { text: 'CNPJ / CPF EMITENTE', ...R },
          { text: 'SÉRIE / NRO. DOCUMENTO', ...R },
          { text: ' ', ...N },
        ],
        ...dados.notasFiscais.map(nf => [
          { text: 'NF-e', ...N },
          { text: `chave: ${fmtCnpj(nf.cnpj)}`, ...N },
          { text: `${String(nf.serie).padStart(3, '0')}/${String(nf.numero).padStart(9, '0')}`, ...N },
          { text: nf.chave, fontSize: 6 },
        ]),
      ],
    },
    layout: 'noBorders',
    border: [true, true, true, true],
    margin: [0, 1, 0, 0],
    padding: 3,
  };
}

// --------------- Função principal ---------------

export async function gerarDactePdf(dados: DadosDacte): Promise<Buffer> {
  const definicao: any = {
    pageSize: 'A4',
    pageMargins: [10, 8, 3, 8],
    content: [
      lr(blocoRecibo(), blocoCabecalho(dados)),
      lr(blocoEmitente(dados), blocoInfoGerais(dados)),
      lr(blocoTrajeto(dados), blocoProtocolo(dados)),
      {
        text: fmtChave(dados.chave),
        ...B12,
        alignment: 'center',
        margin: [0, 3, 0, 0],
        border: [true, true, true, true],
        padding: 5,
      },
      lr(blocoParticipante('REMETENTE', dados.remetente), blocoParticipante('DESTINATÁRIO', dados.destinatario)),
      lr(
        { stack: [blocoParticipante('TOMADOR DO SERVIÇO', dados.tomador)], border: [true, true, true, true], margin: [2, 0, 2, 0] },
        { stack: blocoCarga(dados), border: [true, true, true, true], margin: [2, 0, 2, 0], padding: [2, 2, 2, 2] },
      ),
      lr(blocoComponentes(dados), blocoImposto(dados)),
      blocoNotasFiscais(dados),
      {
        stack: [
          { text: 'OBSERVAÇÕES', ...R, margin: [2, 3, 0, 1] },
          { text: dados.observacoes || ' ', ...P, margin: [2, 0, 2, 5] },
        ],
        border: [true, true, true, true],
        margin: [0, 1, 0, 0],
      },
      {
        table: {
          widths: ['50%', '50%'],
          body: [[
            {
              stack: [
                { text: 'USO EXCLUSIVO DO EMISSOR DO CTE', ...R, alignment: 'center' },
                { text: ' ', ...P },
                { text: ' ', ...P },
              ],
              border: [true, true, true, true],
              padding: 3,
              margin: [2, 3, 2, 0],
            },
            {
              stack: [
                { text: 'RESERVADO AO FISCO', ...R, alignment: 'center' },
                { text: ' ', ...P },
                { text: 'O valor aproximado de tributos incidentes sobre o preço deste serviço é de R$ 0.0', ...P, alignment: 'center' },
              ],
              border: [true, true, true, true],
              padding: 3,
              margin: [2, 3, 2, 0],
            },
          ]],
        },
        layout: 'noBorders',
      },
    ],
    defaultStyle: { fontSize: 6.5, font: 'Roboto' },
  };

  const buffer = await pdfMake.createPdf(definicao).getBuffer();
  return Buffer.from(buffer);
}

// Helper: duas células lado a lado em uma tabela sem borda
function lr(esq: any, dir: any) {
  return {
    table: { widths: ['50%', '50%'], body: [[esq, dir]] },
    layout: 'noBorders' as any,
  };
}
