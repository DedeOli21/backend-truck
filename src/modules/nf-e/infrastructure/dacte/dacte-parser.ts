import { parseChaveAcesso } from '@nf-e/domain/value-objects/chave-acesso';

export interface ParticipanteDacte {
  nome: string | null;
  cnpjCpf: string | null;
  municipio: string | null;
  uf: string | null;
}

export interface DacteExtraido {
  chave: string;
  numero: number;
  serie: number;
  uf: string;
  cnpjEmitente: string;
  emitidoEm: string | null;
  cfop: string | null;
  naturezaOperacao: string | null;
  origem: string | null;
  destino: string | null;
  remetente: ParticipanteDacte;
  destinatario: ParticipanteDacte;
  tomador: ParticipanteDacte;
  valorTotalServico: number | null;
  valorReceber: number | null;
  valorCarga: number | null;
  pesoBruto: number | null;
  produtoPredominante: string | null;
  notasFiscais: string[];
  rntrc: string | null;
  protocolo: string | null;
  autorizadoEm: string | null;
  placa: string | null;
  observacoes: string | null;
  camposNaoEncontrados: string[];
}

const somenteDigitos = (valor: string) => valor.replace(/\D/g, '');

const numeroBr = (valor: string | null | undefined): number | null => {
  if (!valor) return null;
  const limpo = valor.replace(/\./g, '').replace(',', '.');
  const convertido = Number(limpo);
  return Number.isFinite(convertido) ? convertido : null;
};

const primeiro = (texto: string, regex: RegExp): string | null => regex.exec(texto)?.[1]?.trim() ?? null;

/**
 * Extrai as chaves de 44 dígitos do DACTE.
 *
 * Não se pode concatenar todos os dígitos da página: campos vizinhos coláveis
 * produzem sequências de 44 que não são chave nenhuma. Só valem a forma
 * impressa em grupos (3526.0808...) e blocos de 44 dígitos isolados.
 */
export const extrairChaves = (texto: string): string[] => {
  const encontradas = new Set<string>();

  for (const match of texto.matchAll(/\b\d{4}(?:[.\s]\d{4}){10}\b/g)) {
    encontradas.add(somenteDigitos(match[0]));
  }

  for (const match of texto.matchAll(/(?<!\d)\d{44}(?!\d)/g)) {
    encontradas.add(match[0]);
  }

  return [...encontradas].filter((chave) => {
    try {
      parseChaveAcesso(chave);
      return true;
    } catch {
      return false;
    }
  });
};

const participante = (texto: string, rotulo: RegExp): ParticipanteDacte => {
  const bloco = rotulo.exec(texto);

  if (!bloco) {
    return { nome: null, cnpjCpf: null, municipio: null, uf: null };
  }

  // Do rótulo até o próximo rótulo de participante, ou 600 caracteres adiante.
  const inicio = bloco.index + bloco[0].length;
  const resto = texto.slice(inicio, inicio + 600);
  const corte = /(REMETENTE:|DESTINAT[ÁA]RIO:|EXPEDIDOR:|RECEBEDOR:|TOMADOR DO SERVI[ÇC]O:|PRODUTO PREDOMINANTE)/.exec(
    resto.slice(1),
  );
  const janela = corte ? resto.slice(0, corte.index + 1) : resto;

  return {
    nome: bloco[1]?.trim() || null,
    cnpjCpf: primeiro(janela, /CNPJ\/CPF:\s*([\d./-]{11,20})/) ,
    municipio: primeiro(janela, /MUNIC[ÍI]PIO:\s*([^\n]+?)(?:\s{2,}|\s*CEP:|\n)/),
    uf: primeiro(janela, /\bUF:\s*([A-Z]{2})\b/),
  };
};

export const parseDacteTexto = (texto: string): DacteExtraido => {
  const chaves = extrairChaves(texto);
  const chaveCte = chaves.find((chave) => parseChaveAcesso(chave).familia === 'CTE');

  if (!chaveCte) {
    throw new Error(
      'Não foi encontrada uma chave de CT-e válida no PDF. O arquivo pode ser uma imagem digitalizada, sem camada de texto.',
    );
  }

  const documento = parseChaveAcesso(chaveCte);
  const naoEncontrados: string[] = [];

  const registrar = <T>(campo: string, valor: T): T => {
    if (valor === null || valor === undefined || valor === '') {
      naoEncontrados.push(campo);
    }
    return valor;
  };

  const protocoloLinha = /(\d{15})\s+(\d{2}\/\d{2}\/\d{4}[^\n]*)/.exec(texto);

  // "SP - 3503901 - ARUJÁ": UF, código IBGE do município e nome. O rótulo ao
  // lado varia de posição conforme o emissor, mas esse formato não.
  const municipios = [...texto.matchAll(/\b([A-Z]{2})\s*-\s*(\d{7})\s*-\s*([^\n]+)/g)].map(
    (m) => `${m[1]} - ${m[3].trim()}`,
  );
  const cfopLinha = /(\d{4})\s*-\s*([A-ZÇÃÕÁÉÍÓÚ][^\n]{5,})/.exec(texto);

  return {
    chave: chaveCte,
    numero: documento.numero,
    serie: documento.serie,
    uf: documento.uf,
    cnpjEmitente: documento.cnpjEmitente,
    emitidoEm: registrar('emitidoEm', primeiro(texto, /(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}[^\n]*)/)),
    cfop: registrar('cfop', cfopLinha?.[1] ?? null),
    naturezaOperacao: cfopLinha?.[2]?.trim() ?? null,
    origem: registrar('origem', municipios[0] ?? null),
    destino: registrar('destino', municipios[1] ?? null),
    remetente: participante(texto, /REMETENTE:\s*([^\n]+)/),
    destinatario: participante(texto, /DESTINAT[ÁA]RIO:\s*([^\n]+)/),
    tomador: participante(texto, /TOMADOR DO SERVI[ÇC]O:\s*([^\n]+?)(?:\s{2,}MUNIC[ÍI]PIO|$|\n)/m),
    valorTotalServico: registrar(
      'valorTotalServico',
      numeroBr(primeiro(texto, /VALOR TOTAL DO SERVI[ÇC]O\s*\n?R?\$?\s*([\d.,]+)/)),
    ),
    valorReceber: numeroBr(primeiro(texto, /VALOR A RECEBER\s*\n?R?\$?\s*([\d.,]+)/)),
    valorCarga: registrar(
      'valorCarga',
      numeroBr(primeiro(texto, /VALOR TOTAL DA MERCADORIA\s*\n?R?\$?\s*([\d.,]+)/)),
    ),
    pesoBruto: numeroBr(primeiro(texto, /PESO BRUTO\s*\n?([\d.,]+)/)),
    produtoPredominante: primeiro(texto, /PRODUTO PREDOMINANTE\s*\n?([^\n]+)/),
    notasFiscais: chaves.filter((chave) => parseChaveAcesso(chave).familia === 'NFE'),
    rntrc: primeiro(texto, /RNTRC:?\s*([\d]{6,12})/i),
    protocolo: registrar('protocolo', protocoloLinha?.[1] ?? null),
    autorizadoEm: protocoloLinha?.[2]?.trim() ?? null,
    placa: primeiro(texto, /PLACA\s*:?\s*([A-Z]{3}\s?\d[A-Z0-9]\d{2})/i),
    observacoes: primeiro(texto, /OBSERVA[ÇC][ÕO]ES\s*\n?([\s\S]{10,800}?)(?:\n[A-ZÇÃ ]{10,}\n|$)/),
    camposNaoEncontrados: naoEncontrados,
  };
};
