// pdfmake 0.3+ no Node.js: usa o build de browser com addVirtualFileSystem.
// getBuffer() retorna Promise<Buffer> nesta versão.
import { barras128C, modulos128C } from './code128';

const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');
pdfMake.addVirtualFileSystem(pdfFonts);

// --------------- Formatação ---------------

const fmtBr = (n: number, decimais = 2) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: decimais, maximumFractionDigits: decimais });

const fmtCnpjCpf = (doc: string) => {
  const d = (doc ?? '').replace(/\D/g, '');
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return doc ?? '';
};

const fmtChave = (chave: string) => chave.match(/.{4}/g)?.join('.') ?? chave;

const fmtData = (isoDate: string) => {
  const d = new Date(isoDate);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} GMT-03:00`;
};

// --------------- Tipos ---------------

export interface ParticipanteDacte {
  nome: string;
  cnpjCpf: string;
  ie: string;
  logradouro: string;
  bairro: string;
  municipio: string;
  cep: string;
  uf: string;
  fone: string;
}

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
  remetente: ParticipanteDacte;
  destinatario: ParticipanteDacte;
  expedidor?: Partial<ParticipanteDacte>;
  recebedor?: Partial<ParticipanteDacte>;
  tomador: ParticipanteDacte;
  origem: string;
  destino: string;
  valorTotalServico: number;
  valorReceber: number;
  valorCarga: number;
  pesoBruto: number;
  produtoPredominante: string;
  outrasCaracteristicas?: string;
  quantidades: { tipo: string; quantidade: number; unidade: string }[];
  componentes: { nome: string; valor: number }[];
  notasFiscais: { chave: string; cnpj: string; numero: number; serie: number }[];
  protocolo: string;
  autorizadoEm: string;
  observacoes: string;
  /** Conteúdo do QR Code (infCTeSupl/qrCodCTe). Sem ele, monta a URL do SVRS. */
  qrCode?: string;
  /** Logomarca do emitente em data URI (data:image/png;base64,...). */
  logo?: string;
  valorTributos?: number;
}

// --------------- Medidas e estilos ---------------

const MARGEM = 12;
const LARG = 595.28 - MARGEM * 2; // 571.28
const COL_ESQ = 297;              // coluna do emitente / código de barras
const COL_MODAL = 100;            // coluna modal / tipo de serviço

const R = { fontSize: 5.2, color: '#000' };          // rótulo
const V = { fontSize: 6.5 };                          // valor
const VB = { fontSize: 6.5, bold: true };
const VB8 = { fontSize: 8, bold: true };
const TITULO = { fontSize: 8, bold: true };
const CHAVE = { fontSize: 9.5, bold: true };

/** Layout de tabela do pdfmake: espessuras, cores e paddings por índice. */
type Layout = Record<string, (...args: number[]) => number | string>;

const grade: Layout = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => '#000000',
  vLineColor: () => '#000000',
  paddingLeft: () => 2,
  paddingRight: () => 2,
  paddingTop: () => 1,
  paddingBottom: () => 1,
};

const gradeJusta: Layout = { ...grade, paddingTop: () => 0.5, paddingBottom: () => 0.5 };

const container: Layout = {
  ...grade,
  paddingLeft: () => 0,
  paddingRight: () => 0,
  paddingTop: () => 0,
  paddingBottom: () => 0,
};

// --------------- Helpers de célula ---------------

/** Rótulo pequeno em cima, valor embaixo. */
const campo = (rotulo: string, valor: string, alinhamento: 'left' | 'center' | 'right' = 'left', negrito = false) => ({
  stack: [
    { text: rotulo, ...R, alignment: alinhamento },
    { text: valor || ' ', ...(negrito ? VB : V), alignment: alinhamento },
  ],
});

/** "RÓTULO: valor" na mesma linha, como o DACTE padrão imprime. */
const linha = (rotulo: string, valor: string) => ({
  text: [{ text: `${rotulo}: `, ...R }, { text: valor || '', ...V }],
});

/** Duas etiquetas na mesma linha, a segunda encostada à direita. */
const linhaDupla = (esq: [string, string], dir: [string, string]) => ({
  columns: [
    { ...linha(esq[0], esq[1]), width: '*' },
    { ...linha(dir[0], dir[1]), width: 'auto' },
  ],
  columnGap: 6,
});

const faixa = (texto: string) => ({
  table: { widths: ['*'], body: [[{ text: texto, ...R, bold: true, alignment: 'center' }]] },
  layout: grade,
});

const tabela = (widths: unknown[], body: unknown[][], layout: Layout = grade) => ({
  table: { widths, body },
  layout,
});

const vazio = (altura = 0) => ({ text: ' ', ...V, margin: [0, 0, 0, altura] });

// --------------- Blocos ---------------

/** Canhoto: recibo de entrega destacável, no topo da folha. */
function blocoRecibo(dados: DadosDacte) {
  const assinatura = (rotulo: string) => ({
    stack: [vazio(8), { text: rotulo, ...R, alignment: 'center' }],
  });

  const caixaCte = {
    stack: [
      { text: 'CTE', ...VB8, alignment: 'right' },
      {
        columns: [
          { text: 'NRO. DOCUMENTO', ...R, width: '*' },
          { text: String(dados.numero), ...VB8, width: 'auto', alignment: 'right' },
        ],
      },
      {
        columns: [
          { text: 'SÉRIE', ...R, width: '*' },
          { text: String(dados.serie), ...VB8, width: 'auto', alignment: 'right' },
        ],
      },
    ],
  };

  return tabela(
    [143, 135, 161, '*'],
    [
      [
        {
          text: 'DECLARO QUE RECEBI OS VOLUMES DESTE CONHECIMENTO EM PERFEITO ESTADO PELO QUE DOU POR CUMPRIDO O PRESENTE CONTRATO DE TRANSPORTE',
          ...R,
          alignment: 'center',
          colSpan: 4,
        },
        {}, {}, {},
      ],
      [
        { stack: [{ text: 'NOME', ...R }, vazio(6)] },
        { ...assinatura('ASSINATURA / CARIMBO'), rowSpan: 2 },
        { stack: [{ text: 'TÉRMINO DA PRESTAÇÃO - DATA / HORA', ...R, alignment: 'center' }, vazio(3)] },
        { ...caixaCte, rowSpan: 2 },
      ],
      [
        { stack: [{ text: 'RG', ...R }, vazio(6)] },
        {},
        { stack: [{ text: 'INÍCIO DE PRESTAÇÃO - DATA / HORA', ...R, alignment: 'center' }, vazio(3)] },
        {},
      ],
    ],
  );
}

/** Coluna da esquerda do cabeçalho: identificação do emitente, barras e chave. */
function colunaEmitente(dados: DadosDacte) {
  const e = dados.emitente;
  const modulo = (COL_ESQ - 10) / modulos128C(dados.chave);

  const identificacao = {
    stack: [
      { text: e.nome, ...VB, alignment: 'center' },
      { text: e.logradouro, ...VB, alignment: 'center' },
      { text: [e.bairro, e.cep].filter(Boolean).join(' '), ...VB, alignment: 'center' },
      { text: `${e.municipio} - ${e.uf}`, ...VB, alignment: 'center' },
      { text: `CNPJ:${fmtCnpjCpf(e.cnpj)}  IE:${e.ie}`, ...VB, alignment: 'center' },
      { text: `RNTRC:${e.rntrc}  TELEFONE:${e.telefone}`, ...VB, alignment: 'center' },
    ],
  };

  return {
    stack: [
      { text: 'DACTE', ...TITULO, alignment: 'center', margin: [0, 2, 0, 0] },
      {
        text: 'DOCUMENTO AUXILIAR DO CONHECIMENTO DE TRANSPORTE ELETRÔNICO',
        ...R,
        alignment: 'center',
        margin: [0, 0, 0, 2],
      },
      dados.logo
        ? {
            columns: [
              { image: dados.logo, fit: [46, 46], width: 50 },
              { ...identificacao, width: '*' },
            ],
            margin: [2, 0, 2, 2],
          }
        : { ...identificacao, margin: [2, 0, 2, 2] },
      tabela(
        [34, 26, 46, '*', 62],
        [[
          campo('MODELO', '57', 'center'),
          campo('SÉRIE', String(dados.serie), 'center'),
          campo('NÚMERO', String(dados.numero), 'center'),
          campo('DATA E HORA DE EMISSÃO', fmtData(dados.emitidoEm), 'center'),
          campo('INSC. SUFRAMA', ' ', 'center'),
        ]],
        gradeJusta,
      ),
      tabela(
        ['*'],
        [[{ text: 'Consulta em www.cte.fazenda.gov.br/portal', ...R, alignment: 'center' }]],
        gradeJusta,
      ),
      {
        canvas: barras128C(dados.chave, modulo, 32),
        margin: [5, 4, 5, 2],
      },
      { text: fmtChave(dados.chave), ...CHAVE, alignment: 'center', margin: [0, 0, 0, 2] },
    ],
  };
}

/** Coluna da direita do cabeçalho: modal, trajeto, QR Code, protocolo e CFOP. */
function colunaDireita(dados: DadosDacte) {
  const qr =
    dados.qrCode ?? `https://dfe-portal.svrs.rs.gov.br/cte/qrCode?chCTe=${dados.chave}&tpAmb=1`;

  const item = (rotulo: string, valor: string) => campo(rotulo, valor, 'center', true);

  return tabela(
    [COL_MODAL, '*'],
    [
      [item('MODAL', 'RODOVIÁRIO'), campo('PÁGINA', '1 / 1', 'center')],
      [
        item('CTE GLOBALIZADO', 'NÃO'),
        { qr, fit: 108, alignment: 'center', rowSpan: 5, margin: [0, 3, 0, 3] },
      ],
      [item('TIPO DO CTE', 'NORMAL'), {}],
      [item('TIPO DO SERVIÇO', 'NORMAL'), {}],
      [item('INÍCIO DA PRESTAÇÃO', dados.origem), {}],
      [item('TÉRMINO DA PRESTAÇÃO', dados.destino), {}],
      [
        {
          ...campo('PROTOCOLO DE AUTORIZAÇÃO DE USO', `${dados.protocolo}  ${fmtData(dados.autorizadoEm)}`, 'center', true),
          colSpan: 2,
        },
        {},
      ],
      [
        {
          ...campo('CFOP - NATUREZA DA PRESTAÇÃO', `${dados.cfop} - ${dados.naturezaOperacao.toUpperCase()}`, 'center', true),
          colSpan: 2,
        },
        {},
      ],
    ],
    gradeJusta,
  );
}

function blocoCabecalho(dados: DadosDacte) {
  return tabela(
    [COL_ESQ, '*'],
    [[colunaEmitente(dados), colunaDireita(dados)]],
    container,
  );
}

function celulaParticipante(rotulo: string, p?: Partial<ParticipanteDacte>) {
  const dados = p ?? {};
  const endereco = [dados.logradouro, dados.bairro].filter(Boolean).join(' - ');

  return {
    stack: [
      linha(rotulo, dados.nome ?? ''),
      linha('ENDEREÇO', endereco),
      linhaDupla(['MUNICÍPIO', dados.municipio ?? ''], ['CEP', dados.cep ?? '']),
      linhaDupla(['CNPJ/CPF', fmtCnpjCpf(dados.cnpjCpf ?? '')], ['INSCRIÇÃO ESTADUAL', dados.ie ?? '']),
      linhaDupla(['UF', dados.uf ?? ''], ['PAÍS', 'BRASIL']),
      linha('FONE', dados.fone ?? ''),
    ],
    margin: [1, 1, 1, 1],
  };
}

function blocoParticipantes(dados: DadosDacte) {
  return tabela(
    ['50%', '50%'],
    [
      [celulaParticipante('REMETENTE', dados.remetente), celulaParticipante('DESTINATÁRIO', dados.destinatario)],
      [celulaParticipante('EXPEDIDOR', dados.expedidor), celulaParticipante('RECEBEDOR', dados.recebedor)],
    ],
  );
}

function blocoTomador(dados: DadosDacte) {
  const t = dados.tomador;
  const endereco = [t.logradouro, t.bairro].filter(Boolean).join(' - ');

  return tabela(
    ['*', 150, 90],
    [
      [linha('TOMADOR DO SERVIÇO', t.nome), linha('MUNICÍPIO', t.municipio), linha('CEP', t.cep)],
      [linha('ENDEREÇO', endereco), linha('UF', t.uf), linha('PAÍS', 'BRASIL')],
      [linha('CNPJ/CPF', fmtCnpjCpf(t.cnpjCpf)), linha('INSCRIÇÃO ESTADUAL', t.ie), linha('FONE', t.fone)],
    ],
  );
}

function blocoCarga(dados: DadosDacte) {
  const quantidades = dados.quantidades.length
    ? dados.quantidades
    : [{ tipo: 'PESO BRUTO', quantidade: dados.pesoBruto, unidade: 'KG' }];

  const colunas = [...quantidades.slice(0, 5)];
  while (colunas.length < 5) colunas.push({ tipo: '', quantidade: NaN, unidade: '' });

  const larguras = ['*', '*', '*', '*', '*'];

  return [
    tabela(
      ['*', '*', 150],
      [[
        campo('PRODUTO PREDOMINANTE', dados.produtoPredominante),
        campo('OUTRAS CARACTERÍSTICAS DA CARGA', dados.outrasCaracteristicas ?? ' '),
        campo('VALOR TOTAL DA MERCADORIA', `R$ ${fmtBr(dados.valorCarga)}`),
      ]],
    ),
    tabela(
      [70, ...larguras],
      [
        [{ text: ' ', ...R }, ...colunas.map((q) => ({ text: q.tipo, ...R, alignment: 'center' }))],
        [
          { text: 'QUANTIDADE', ...R, alignment: 'center' },
          ...colunas.map((q) => ({
            text: Number.isFinite(q.quantidade) ? fmtBr(q.quantidade, 4) : ' ',
            ...V,
            alignment: 'center',
          })),
        ],
        [
          { text: 'CARGA', ...R, alignment: 'center' },
          ...colunas.map((q) => ({ text: q.unidade || ' ', ...V, alignment: 'center' })),
        ],
      ],
      gradeJusta,
    ),
  ];
}

function blocoComponentes(dados: DadosDacte) {
  // Como no DACTE padrão: preenche a primeira coluna até quatro linhas antes de
  // passar para a seguinte.
  const POR_COLUNA = 4;
  const colunas = [0, 1, 2].map((i) => dados.componentes.slice(i * POR_COLUNA, (i + 1) * POR_COLUNA));
  const linhas = Math.min(POR_COLUNA, Math.max(1, ...colunas.map((c) => c.length)));

  const totais = {
    stack: [
      campo('VALOR TOTAL DO SERVIÇO', `R$ ${fmtBr(dados.valorTotalServico)}`, 'left', true),
      { canvas: [{ type: 'line', x1: 0, y1: 2, x2: 148, y2: 2, lineWidth: 0.5 }] },
      campo('VALOR A RECEBER', `R$ ${fmtBr(dados.valorReceber)}`, 'left', true),
    ],
  };

  const corpo: unknown[][] = [
    [
      { text: 'NOME', ...R }, { text: 'VALOR', ...R, alignment: 'right' },
      { text: 'NOME', ...R }, { text: 'VALOR', ...R, alignment: 'right' },
      { text: 'NOME', ...R }, { text: 'VALOR', ...R, alignment: 'right' },
      { ...totais, rowSpan: linhas + 1 },
    ],
  ];

  for (let i = 0; i < linhas; i += 1) {
    corpo.push([
      ...colunas.flatMap((coluna) => {
        const item = coluna[i];
        return [
          { text: item?.nome ?? ' ', ...V },
          { text: item ? fmtBr(item.valor) : ' ', ...V, alignment: 'right' },
        ];
      }),
      {},
    ]);
  }

  return [
    faixa('COMPONENTES DO VALOR DA PRESTAÇÃO DE SERVIÇO'),
    tabela(['*', 50, '*', 50, '*', 50, 150], corpo, gradeJusta),
  ];
}

function blocoImposto(dados: DadosDacte) {
  const normal = dados.emitente.crt === '3';
  const base = normal ? dados.valorTotalServico : 0;
  const aliquota = normal ? 12 : 0;

  return [
    faixa('INFORMAÇÕES RELATIVAS AO IMPOSTO'),
    tabela(
      ['*', 90, 55, 55, 55, 55],
      [[
        campo(
          'CLASSIFICAÇÃO TRIBUTÁRIA DO SERVIÇO',
          normal ? '00 - Tributação normal do ICMS' : '90 - Simples Nacional',
        ),
        campo('BASE DE CÁLCULO', fmtBr(base)),
        campo('ALÍQ. ICMS', fmtBr(aliquota)),
        campo('VALOR ICMS', fmtBr((base * aliquota) / 100)),
        campo('% RED. BC.', '0,00'),
        campo('V. CRÉDITO', '0,00'),
      ]],
    ),
  ];
}

function blocoDocumentos(dados: DadosDacte) {
  const cabecalho = [
    { text: 'TP DOC.', ...R, alignment: 'center' },
    { text: 'CNPJ / CPF EMITENTE', ...R, alignment: 'center' },
    { text: 'SÉRIE / NRO. DOCUMENTO', ...R, alignment: 'center', colSpan: 2 },
    {},
  ];

  const linhas = dados.notasFiscais.map((nf) => [
    { text: 'NF-e chave:', ...V },
    { text: fmtCnpjCpf(nf.cnpj), ...V, alignment: 'center' },
    { text: `${String(nf.serie).padStart(3, '0')}/${String(nf.numero).padStart(9, '0')}`, ...V, alignment: 'center' },
    { text: nf.chave, ...V, alignment: 'center' },
  ]);

  // Espaço em branco reservado aos demais documentos originários.
  const preenchimento = [
    { text: ' ', ...V, margin: [0, 0, 0, 120] },
    { text: ' ', ...V }, { text: ' ', ...V }, { text: ' ', ...V },
  ];

  return tabela([70, '*', 90, '*'], [cabecalho, ...linhas, preenchimento], gradeJusta);
}

function blocoFluxo() {
  return [
    faixa('PREVISÃO DO FLUXO DA CARGA'),
    tabela(
      ['50%', '50%'],
      [
        [
          campo('SIGLA OU CÓDIGO INT. DA FILIAL/PORTO/ESTAÇÃO/AEROPORTO DE ORIGEM', ' '),
          campo('SIGLA OU CÓDIGO INT. DA FILIAL/PORTO/ESTAÇÃO/AEROPORTO DE PASSAGEM', ' '),
        ],
        [
          campo('SIGLA OU CÓDIGO INT. DA FILIAL/PORTO/ESTAÇÃO/AEROPORTO DE DESTINO', ' '),
          { text: ' ', ...V },
        ],
      ],
    ),
  ];
}

function blocoObservacoes(dados: DadosDacte) {
  return [
    faixa('OBSERVAÇÕES'),
    tabela(['*'], [[{ text: dados.observacoes || ' ', ...V, margin: [0, 0, 0, 12] }]]),
    tabela(
      ['50%', '50%'],
      [
        [
          { text: 'INFORMAÇÃO DO CTE GLOBALIZADO', ...R, bold: true, alignment: 'center' },
          { text: 'CTE SUBSTITUÍDO', ...R, bold: true, alignment: 'center' },
        ],
        [{ text: ' ', ...V, margin: [0, 0, 0, 10] }, { text: ' ', ...V }],
      ],
    ),
  ];
}

function blocoRodape(dados: DadosDacte) {
  const tributos = dados.valorTributos ?? 0;

  return tabela(
    ['*', '*'],
    [
      [
        { text: 'USO EXCLUSIVO DO EMISSOR DO CTE', ...R, bold: true, alignment: 'center' },
        { text: 'RESERVADO AO FISCO', ...R, bold: true, alignment: 'center' },
      ],
      [
        {
          text: `O valor aproximado de tributos incidentes sobre o preço deste serviço é de R$ ${fmtBr(tributos)}`,
          ...R,
          margin: [0, 0, 0, 60],
        },
        { text: ' ', ...V },
      ],
    ],
  );
}

// --------------- Função principal ---------------

export async function gerarDactePdf(dados: DadosDacte): Promise<Buffer> {
  const definicao: any = {
    pageSize: 'A4',
    pageMargins: [MARGEM, 10, MARGEM, 10],
    content: [
      blocoRecibo(dados),
      {
        canvas: [
          { type: 'line', x1: 0, y1: 0, x2: LARG, y2: 0, lineWidth: 0.5, dash: { length: 3 } },
        ],
        margin: [0, 3, 0, 3],
      },
      blocoCabecalho(dados),
      blocoParticipantes(dados),
      blocoTomador(dados),
      ...blocoCarga(dados),
      ...blocoComponentes(dados),
      ...blocoImposto(dados),
      blocoDocumentos(dados),
      ...blocoFluxo(),
      ...blocoObservacoes(dados),
      blocoRodape(dados),
    ],
    defaultStyle: { fontSize: 6.5, font: 'Roboto', lineHeight: 1.05 },
  };

  const buffer = await pdfMake.createPdf(definicao).getBuffer();
  return Buffer.from(buffer);
}
