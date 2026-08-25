import { calcularDigitoVerificador } from '@nf-e/domain/value-objects/chave-acesso';
import { ufToCode } from '@nf-e/domain/validators/uf.validator';
import { EnderecoCte } from '@nf-e/domain/emissao/gerar-cte-xml';

export interface EmitenteMdfe {
  cnpjCpf: string;
  inscricaoEstadual: string;
  nome: string;
  endereco: EnderecoCte;
}

export interface VeiculoMdfe {
  placa: string;
  rntrc: string;
  /** Peso vazio do veículo, em kg. */
  tara?: number;
  /** Capacidade de carga, em kg. */
  capacidadeKg?: number;
  uf: string;
}

export interface CondutorMdfe {
  nome: string;
  cpf: string;
}

export interface DadosMdfe {
  ambiente: 1 | 2;
  serie: number;
  numero: number;
  codigoNumerico: number;
  emitidoEm: Date;
  ufIni: string;
  ufFim: string;
  /** UFs percorridas entre início e fim, quando a viagem passa por elas. */
  ufPercurso: string[];
  municipioCarregamento: { codigoMunicipio: string; municipio: string };
  municipioDescarga: { codigoMunicipio: string; municipio: string };
  emitente: EmitenteMdfe;
  veiculo: VeiculoMdfe;
  condutor: CondutorMdfe;
  cteChaves: string[];
  totais: { valorCarga: number; pesoBrutoKg: number };
}

export interface MdfeGerado {
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

/** Data no formato exigido: AAAA-MM-DDThh:mm:ssTZD, fuso de Brasília. */
const dataMdfe = (data: Date): string => {
  const local = new Date(data.getTime() - 3 * 3600 * 1000);
  return `${local.toISOString().slice(0, 19)}-03:00`;
};

const enderecoXml = (endereco: EnderecoCte) =>
  `<enderEmit>` +
  `<xLgr>${escapar(endereco.logradouro)}</xLgr>` +
  `<nro>${escapar(endereco.numero)}</nro>` +
  `<xBairro>${escapar(endereco.bairro)}</xBairro>` +
  `<cMun>${endereco.codigoMunicipio}</cMun>` +
  `<xMun>${escapar(endereco.municipio)}</xMun>` +
  `<CEP>${somenteDigitos(endereco.cep)}</CEP>` +
  `<UF>${endereco.uf}</UF>` +
  `</enderEmit>`;

/**
 * Chave de acesso do MDF-e: mesma estrutura de 44 dígitos do CT-e/NF-e,
 * modelo 58, verificada por módulo 11.
 */
export const montarChaveMdfe = (dados: DadosMdfe): string => {
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
    '58' +
    pad(dados.serie, 3) +
    pad(dados.numero, 9) +
    '1' +
    pad(dados.codigoNumerico, 8);

  return base + calcularDigitoVerificador(base);
};

/**
 * Monta o XML do MDF-e 3.00, modal rodoviário, reunindo os CT-e da viagem.
 * Não assina: a assinatura entra depois, sobre este XML.
 */
export const gerarMdfeXml = (dados: DadosMdfe): MdfeGerado => {
  const chave = montarChaveMdfe(dados);
  const id = `MDFe${chave}`;
  const codigoUf = ufToCode(dados.emitente.endereco.uf)!;

  const infPercurso = dados.ufPercurso.length
    ? dados.ufPercurso.map((uf) => `<infPercurso><UFPer>${uf}</UFPer></infPercurso>`).join('')
    : '';

  const ide =
    `<ide>` +
    `<cUF>${codigoUf}</cUF>` +
    `<tpAmb>${dados.ambiente}</tpAmb>` +
    `<tpEmit>1</tpEmit>` +
    `<mod>58</mod>` +
    `<serie>${dados.serie}</serie>` +
    `<nMDF>${dados.numero}</nMDF>` +
    `<cMDF>${pad(dados.codigoNumerico, 8)}</cMDF>` +
    `<cDV>${chave.slice(43)}</cDV>` +
    `<modal>1</modal>` +
    `<dhEmi>${dataMdfe(dados.emitidoEm)}</dhEmi>` +
    `<tpEmis>1</tpEmis>` +
    `<procEmi>0</procEmi>` +
    `<verProc>truck-1.0</verProc>` +
    `<UFIni>${dados.ufIni}</UFIni>` +
    `<UFFim>${dados.ufFim}</UFFim>` +
    `<infMunCarrega>` +
    `<cMunCarrega>${dados.municipioCarregamento.codigoMunicipio}</cMunCarrega>` +
    `<xMunCarrega>${escapar(dados.municipioCarregamento.municipio)}</xMunCarrega>` +
    `</infMunCarrega>` +
    infPercurso +
    `</ide>`;

  const emit =
    `<emit>` +
    `<CNPJ>${somenteDigitos(dados.emitente.cnpjCpf)}</CNPJ>` +
    `<IE>${somenteDigitos(dados.emitente.inscricaoEstadual)}</IE>` +
    `<xNome>${escapar(dados.emitente.nome)}</xNome>` +
    enderecoXml(dados.emitente.endereco) +
    `</emit>`;

  const infModal =
    `<infModal versaoModal="3.00">` +
    `<rodo>` +
    `<infANTT><RNTRC>${somenteDigitos(dados.veiculo.rntrc)}</RNTRC></infANTT>` +
    `<veicTracao>` +
    `<placa>${dados.veiculo.placa.toUpperCase()}</placa>` +
    (dados.veiculo.tara ? `<tara>${Math.round(dados.veiculo.tara)}</tara>` : '') +
    `<tpRod>01</tpRod>` +
    `<tpCar>00</tpCar>` +
    `<UF>${dados.veiculo.uf}</UF>` +
    `</veicTracao>` +
    `<condutor>` +
    `<xNome>${escapar(dados.condutor.nome)}</xNome>` +
    `<CPF>${somenteDigitos(dados.condutor.cpf)}</CPF>` +
    `</condutor>` +
    `</rodo>` +
    `</infModal>`;

  const chCteXml = dados.cteChaves
    .map((chave) => `<infCTe><chCTe>${chave}</chCTe></infCTe>`)
    .join('');

  const infDoc =
    `<infDoc>` +
    `<infMunDescarga>` +
    `<cMunDescarga>${dados.municipioDescarga.codigoMunicipio}</cMunDescarga>` +
    `<xMunDescarga>${escapar(dados.municipioDescarga.municipio)}</xMunDescarga>` +
    chCteXml +
    `</infMunDescarga>` +
    `</infDoc>`;

  const tot =
    `<tot>` +
    `<qCTe>${dados.cteChaves.length}</qCTe>` +
    `<qNFe>0</qNFe>` +
    `<vCarga>${dec(dados.totais.valorCarga)}</vCarga>` +
    `<cUnid>01</cUnid>` +
    `<qCarga>${dec(dados.totais.pesoBrutoKg, 4)}</qCarga>` +
    `</tot>`;

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<MDFe xmlns="http://www.portalfiscal.inf.br/mdfe">` +
    `<infMDFe versao="3.00" Id="${id}">` +
    ide +
    emit +
    infModal +
    infDoc +
    tot +
    `</infMDFe>` +
    `</MDFe>`;

  return { chave, xml, id };
};
