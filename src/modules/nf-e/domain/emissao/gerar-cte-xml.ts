import { calcularDigitoVerificador } from '@nf-e/domain/value-objects/chave-acesso';
import { ufToCode } from '@nf-e/domain/validators/uf.validator';

export interface EnderecoCte {
  logradouro: string;
  numero: string;
  bairro: string;
  codigoMunicipio: string;
  municipio: string;
  cep: string;
  uf: string;
}

export interface ParticipanteCte {
  cnpjCpf: string;
  inscricaoEstadual?: string | null;
  nome: string;
  fone?: string | null;
  endereco: EnderecoCte;
}

export interface NotaTransportada {
  chave: string;
}

export interface DadosCte {
  ambiente: 1 | 2;
  serie: number;
  numero: number;
  codigoNumerico: number;
  emitidoEm: Date;
  cfop: string;
  naturezaOperacao: string;
  /** 0 = remetente, 1 = expedidor, 2 = recebedor, 3 = destinatário. */
  tomador: 0 | 1 | 2 | 3;
  inicio: { codigoMunicipio: string; municipio: string; uf: string };
  fim: { codigoMunicipio: string; municipio: string; uf: string };
  emitente: ParticipanteCte & { inscricaoEstadual: string; crt: 1 | 2 | 3; rntrc?: string | null };
  remetente: ParticipanteCte;
  destinatario: ParticipanteCte;
  valorTotal: number;
  valorReceber: number;
  componentes: { nome: string; valor: number }[];
  valorCarga: number;
  produtoPredominante: string;
  pesoBruto: number;
  quantidades?: { tipo: string; unidade: '00' | '01' | '02' | '03'; quantidade: number }[];
  notas: NotaTransportada[];
  observacoes?: string | null;
  responsavelTecnico?: { cnpj: string; contato: string; email: string; fone: string } | null;
}

export interface CteGerado {
  chave: string;
  xml: string;
  id: string;
}

const escapar = (valor: string) =>
  valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const pad = (valor: number | string, tamanho: number) => String(valor).padStart(tamanho, '0');

const dec = (valor: number, casas = 2) => valor.toFixed(casas);

const somenteDigitos = (valor: string) => (valor ?? '').replace(/\D/g, '');

/** Data no formato exigido: AAAA-MM-DDThh:mm:ssTZD. */
const dataCte = (data: Date, uf: string): string => {
  // O fuso de Brasília cobre as UFs onde a empresa opera; ajustar aqui se
  // passar a emitir de UF com outro fuso.
  const offset = uf === 'AC' ? '-05:00' : uf === 'AM' || uf === 'RR' || uf === 'MT' || uf === 'MS' || uf === 'RO' ? '-04:00' : '-03:00';
  const local = new Date(data.getTime() - 3 * 3600 * 1000);
  return `${local.toISOString().slice(0, 19)}${offset}`;
};

/**
 * O endereço do emitente segue um tipo próprio no XSD e não aceita cPais/xPais;
 * os demais aceitam, e nessa ordem.
 */
const enderecoXml = (tag: string, endereco: EnderecoCte, comPais: boolean) =>
  `<${tag}>` +
  `<xLgr>${escapar(endereco.logradouro)}</xLgr>` +
  `<nro>${escapar(endereco.numero)}</nro>` +
  `<xBairro>${escapar(endereco.bairro)}</xBairro>` +
  `<cMun>${endereco.codigoMunicipio}</cMun>` +
  `<xMun>${escapar(endereco.municipio)}</xMun>` +
  `<CEP>${somenteDigitos(endereco.cep)}</CEP>` +
  `<UF>${endereco.uf}</UF>` +
  (comPais ? `<cPais>1058</cPais><xPais>BRASIL</xPais>` : '') +
  `</${tag}>`;

/**
 * Em homologação a SEFAZ exige esta razão social exata no remetente, para
 * deixar evidente que o documento não tem valor fiscal (rejeição 646).
 */
export const RAZAO_SOCIAL_HOMOLOGACAO =
  'CTE EMITIDO EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL';

const participanteXml = (
  tag: string,
  participante: ParticipanteCte,
  tagEndereco: string,
) => {
  const documento = somenteDigitos(participante.cnpjCpf);
  const docTag = documento.length === 14 ? 'CNPJ' : 'CPF';

  return (
    `<${tag}>` +
    `<${docTag}>${documento}</${docTag}>` +
    (participante.inscricaoEstadual
      ? `<IE>${somenteDigitos(participante.inscricaoEstadual)}</IE>`
      : '') +
    `<xNome>${escapar(participante.nome)}</xNome>` +
    (participante.fone ? `<fone>${somenteDigitos(participante.fone)}</fone>` : '') +
    enderecoXml(tagEndereco, participante.endereco, true) +
    `</${tag}>`
  );
};

export const montarChaveCte = (dados: DadosCte): string => {
  const codigoUf = ufToCode(dados.emitente.endereco.uf);

  if (!codigoUf) {
    throw new Error(`UF do emitente inválida: ${dados.emitente.endereco.uf}`);
  }

  const emissao = dados.emitidoEm;
  const base =
    pad(codigoUf, 2) +
    pad(emissao.getFullYear() % 100, 2) +
    pad(emissao.getMonth() + 1, 2) +
    pad(somenteDigitos(dados.emitente.cnpjCpf), 14) +
    '57' +
    pad(dados.serie, 3) +
    pad(dados.numero, 9) +
    '1' +
    pad(dados.codigoNumerico, 8);

  return base + calcularDigitoVerificador(base);
};

/**
 * Monta o XML do CT-e 4.00, modal rodoviário, no formato que o DACTE de
 * exemplo representa. Não assina: a assinatura entra depois, sobre este XML.
 */
export const gerarCteXml = (dados: DadosCte): CteGerado => {
  const chave = montarChaveCte(dados);
  const id = `CTe${chave}`;
  const codigoUf = ufToCode(dados.emitente.endereco.uf)!;

  const ide =
    `<ide>` +
    `<cUF>${codigoUf}</cUF>` +
    `<cCT>${pad(dados.codigoNumerico, 8)}</cCT>` +
    `<CFOP>${dados.cfop}</CFOP>` +
    `<natOp>${escapar(dados.naturezaOperacao)}</natOp>` +
    `<mod>57</mod>` +
    `<serie>${dados.serie}</serie>` +
    `<nCT>${dados.numero}</nCT>` +
    `<dhEmi>${dataCte(dados.emitidoEm, dados.emitente.endereco.uf)}</dhEmi>` +
    `<tpImp>1</tpImp>` +
    `<tpEmis>1</tpEmis>` +
    `<cDV>${chave.slice(43)}</cDV>` +
    `<tpAmb>${dados.ambiente}</tpAmb>` +
    `<tpCTe>0</tpCTe>` +
    `<procEmi>0</procEmi>` +
    `<verProc>truck-1.0</verProc>` +
    `<cMunEnv>${dados.emitente.endereco.codigoMunicipio}</cMunEnv>` +
    `<xMunEnv>${escapar(dados.emitente.endereco.municipio)}</xMunEnv>` +
    `<UFEnv>${dados.emitente.endereco.uf}</UFEnv>` +
    `<modal>01</modal>` +
    `<tpServ>0</tpServ>` +
    `<cMunIni>${dados.inicio.codigoMunicipio}</cMunIni>` +
    `<xMunIni>${escapar(dados.inicio.municipio)}</xMunIni>` +
    `<UFIni>${dados.inicio.uf}</UFIni>` +
    `<cMunFim>${dados.fim.codigoMunicipio}</cMunFim>` +
    `<xMunFim>${escapar(dados.fim.municipio)}</xMunFim>` +
    `<UFFim>${dados.fim.uf}</UFFim>` +
    `<retira>1</retira>` +
    `<indIEToma>1</indIEToma>` +
    `<toma3><toma>${dados.tomador}</toma></toma3>` +
    `</ide>`;

  const emit =
    `<emit>` +
    `<CNPJ>${somenteDigitos(dados.emitente.cnpjCpf)}</CNPJ>` +
    `<IE>${somenteDigitos(dados.emitente.inscricaoEstadual)}</IE>` +
    `<xNome>${escapar(dados.emitente.nome)}</xNome>` +
    enderecoXml('enderEmit', dados.emitente.endereco, false) +
    `<CRT>${dados.emitente.crt}</CRT>` +
    `</emit>`;

  const componentes = dados.componentes
    .map(
      (comp) =>
        `<Comp><xNome>${escapar(comp.nome)}</xNome><vComp>${dec(comp.valor)}</vComp></Comp>`,
    )
    .join('');

  const vPrest =
    `<vPrest>` +
    `<vTPrest>${dec(dados.valorTotal)}</vTPrest>` +
    `<vRec>${dec(dados.valorReceber)}</vRec>` +
    componentes +
    `</vPrest>`;

  // CRT 1 e 2 são Simples Nacional: CST 90 com ICMS simplificado.
  const imp =
    `<imp>` +
    (dados.emitente.crt === 3
      ? `<ICMS><ICMS00><CST>00</CST><vBC>${dec(dados.valorTotal)}</vBC><pICMS>12.00</pICMS><vICMS>${dec(dados.valorTotal * 0.12)}</vICMS></ICMS00></ICMS>`
      : `<ICMS><ICMSSN><CST>90</CST><indSN>1</indSN></ICMSSN></ICMS>`) +
    `</imp>`;

  const quantidades = (dados.quantidades ?? [
    { tipo: 'PESO BRUTO', unidade: '01' as const, quantidade: dados.pesoBruto },
  ])
    .map(
      (q) =>
        `<infQ><cUnid>${q.unidade}</cUnid><tpMed>${escapar(q.tipo)}</tpMed><qCarga>${dec(q.quantidade, 4)}</qCarga></infQ>`,
    )
    .join('');

  const notas = dados.notas
    .map((nota) => `<infNFe><chave>${somenteDigitos(nota.chave)}</chave></infNFe>`)
    .join('');

  const infCTeNorm =
    `<infCTeNorm>` +
    `<infCarga>` +
    `<vCarga>${dec(dados.valorCarga)}</vCarga>` +
    `<proPred>${escapar(dados.produtoPredominante)}</proPred>` +
    quantidades +
    `</infCarga>` +
    `<infDoc>${notas}</infDoc>` +
    `<infModal versaoModal="4.00">` +
    `<rodo>${dados.emitente.rntrc ? `<RNTRC>${somenteDigitos(dados.emitente.rntrc)}</RNTRC>` : ''}</rodo>` +
    `</infModal>` +
    `</infCTeNorm>`;

  const infAdic = dados.observacoes
    ? `<compl><xObs>${escapar(dados.observacoes)}</xObs></compl>`
    : '';

  const respTec = dados.responsavelTecnico
    ? `<infRespTec>` +
      `<CNPJ>${somenteDigitos(dados.responsavelTecnico.cnpj)}</CNPJ>` +
      `<xContato>${escapar(dados.responsavelTecnico.contato)}</xContato>` +
      `<email>${escapar(dados.responsavelTecnico.email)}</email>` +
      `<fone>${somenteDigitos(dados.responsavelTecnico.fone)}</fone>` +
      `</infRespTec>`
    : '';

  // O QR Code do DACTE é obrigatório no layout 4.00 e vai em infCTeSupl.
  const urlQrCode =
    dados.ambiente === 1
      ? `https://dfe-portal.svrs.rs.gov.br/cte/qrCode?chCTe=${chave}&tpAmb=1`
      : `https://dfe-portal.svrs.rs.gov.br/cte/qrCode?chCTe=${chave}&tpAmb=2`;

  const infCTeSupl = `<infCTeSupl><qrCodCTe>${escapar(urlQrCode)}</qrCodCTe></infCTeSupl>`;

  const xml =
    `<CTe xmlns="http://www.portalfiscal.inf.br/cte">` +
    `<infCte versao="4.00" Id="${id}">` +
    ide +
    infAdic +
    emit +
    participanteXml(
      'rem',
      dados.ambiente === 2
        ? { ...dados.remetente, nome: RAZAO_SOCIAL_HOMOLOGACAO }
        : dados.remetente,
      'enderReme',
    ) +
    participanteXml('dest', dados.destinatario, 'enderDest') +
    vPrest +
    imp +
    infCTeNorm +
    respTec +
    `</infCte>` +
    infCTeSupl +
    `</CTe>`;

  return { chave, id, xml };
};
