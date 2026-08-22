import { BadRequestException } from '@nestjs/common';
import { SituacaoNfe } from '@nf-e/domain/providers/nfe.provider';
import { parseChaveAcesso } from '@nf-e/domain/value-objects/chave-acesso';
import { buscarRecursivo, parser, texto } from '@nf-e/infrastructure/sefaz/consulta-protocolo';
import { situacaoDoStatus } from '@nf-e/infrastructure/sefaz/consulta-protocolo';

export interface Participante {
  cnpjCpf: string;
  nome: string;
}

export interface Local {
  municipio: string;
  uf: string;
}

export interface ComponenteValor {
  nome: string;
  valor: number;
}

export interface QuantidadeCarga {
  tipo: string;
  quantidade: number;
}

export interface CteImportado {
  chave: string;
  numero: number;
  serie: number;
  cfop: string;
  naturezaOperacao: string | null;
  emitidoEm: string | null;
  origem: Local | null;
  destino: Local | null;
  emitente: Participante | null;
  remetente: Participante | null;
  destinatario: Participante | null;
  tomador: Participante | null;
  valorTotal: number;
  valorReceber: number;
  componentes: ComponenteValor[];
  valorCarga: number | null;
  produtoPredominante: string | null;
  quantidades: QuantidadeCarga[];
  notasFiscais: string[];
  rntrc: string | null;
  protocolo: string | null;
  autorizadoEm: string | null;
  situacao: SituacaoNfe | null;
}

const lista = (valor: unknown): Record<string, unknown>[] => {
  if (!valor) return [];
  return (Array.isArray(valor) ? valor : [valor]) as Record<string, unknown>[];
};

const numero = (valor: unknown): number | null => {
  const bruto = texto(valor);
  if (bruto === null || bruto.trim() === '') return null;
  const convertido = Number(bruto);
  return Number.isFinite(convertido) ? convertido : null;
};

const participante = (node: unknown): Participante | null => {
  if (!node || typeof node !== 'object') return null;
  const obj = node as Record<string, unknown>;
  const documento = texto(obj.CNPJ) ?? texto(obj.CPF);
  const nome = texto(obj.xNome);

  return documento || nome ? { cnpjCpf: documento ?? '', nome: nome ?? '' } : null;
};

const local = (municipio: unknown, uf: unknown): Local | null => {
  const m = texto(municipio);
  const u = texto(uf);
  return m || u ? { municipio: m ?? '', uf: u ?? '' } : null;
};

/**
 * Lê o XML do CT-e, com ou sem o envelope cteProc. O que interessa do documento
 * está em infCte; o protocolo de autorização, quando existe, vem em protCTe.
 */
export const parseCteXml = (xml: string): CteImportado => {
  let arvore: unknown;

  try {
    arvore = parser.parse(xml);
  } catch (error) {
    const motivo = error instanceof Error ? error.message : String(error);
    throw new BadRequestException(`XML inválido: ${motivo}`);
  }

  const infCte = buscarRecursivo(arvore, 'infCte');

  if (!infCte) {
    // O engano mais comum é mandar a NF-e transportada em vez do CT-e.
    const ehNfe = Boolean(buscarRecursivo(arvore, 'infNFe'));

    throw new BadRequestException(
      ehNfe
        ? 'Este XML é de uma NF-e, não de um CT-e. Use POST /nf-e/importar-xml.'
        : 'XML não é de um CT-e: elemento infCte não encontrado.',
    );
  }

  const ide = buscarRecursivo(infCte, 'ide') ?? {};
  const infProt = buscarRecursivo(arvore, 'infProt');
  const infCarga = buscarRecursivo(infCte, 'infCarga') ?? {};
  const vPrest = buscarRecursivo(infCte, 'vPrest') ?? {};

  // A chave vem do atributo Id, mas o parser descarta atributos: reconstrói-se
  // a partir do protocolo, ou dos próprios campos do documento.
  const chaveProtocolo = infProt ? texto(infProt.chCTe) : null;
  const chaveRegex = /CTe(\d{44})/.exec(xml)?.[1] ?? null;
  const chave = chaveProtocolo ?? chaveRegex;

  if (!chave) {
    throw new BadRequestException('Não foi possível determinar a chave de acesso do CT-e.');
  }

  parseChaveAcesso(chave);

  const codigoStatus = infProt ? Number(infProt.cStat) : null;

  return {
    chave,
    numero: numero(ide.nCT) ?? 0,
    serie: numero(ide.serie) ?? 0,
    cfop: texto(ide.CFOP) ?? '',
    naturezaOperacao: texto(ide.natOp),
    emitidoEm: texto(ide.dhEmi),
    origem: local(ide.xMunIni, ide.UFIni),
    destino: local(ide.xMunFim, ide.UFFim),
    emitente: participante(buscarRecursivo(infCte, 'emit')),
    remetente: participante(buscarRecursivo(infCte, 'rem')),
    destinatario: participante(buscarRecursivo(infCte, 'dest')),
    tomador: participante(buscarRecursivo(infCte, 'toma')),
    valorTotal: numero(vPrest.vTPrest) ?? 0,
    valorReceber: numero(vPrest.vRec) ?? 0,
    componentes: lista(vPrest.Comp).map((comp) => ({
      nome: texto(comp.xNome) ?? '',
      valor: numero(comp.vComp) ?? 0,
    })),
    valorCarga: numero(infCarga.vCarga),
    produtoPredominante: texto(infCarga.proPred),
    quantidades: lista(infCarga.infQ).map((q) => ({
      tipo: texto(q.tpMed) ?? '',
      quantidade: numero(q.qCarga) ?? 0,
    })),
    notasFiscais: lista(buscarRecursivo(infCte, 'infDoc')?.infNFe)
      .map((nfe) => texto(nfe.chave) ?? '')
      .filter(Boolean),
    rntrc: texto(buscarRecursivo(infCte, 'rodo')?.RNTRC),
    protocolo: infProt ? texto(infProt.nProt) : null,
    autorizadoEm: infProt ? texto(infProt.dhRecbto) : null,
    situacao: codigoStatus ? situacaoDoStatus(codigoStatus) : null,
  };
};
