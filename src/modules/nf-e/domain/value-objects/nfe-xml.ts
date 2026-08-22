import { BadRequestException } from '@nestjs/common';
import { SituacaoNfe } from '@nf-e/domain/providers/nfe.provider';
import { parseChaveAcesso } from '@nf-e/domain/value-objects/chave-acesso';
import {
  buscarRecursivo,
  parser,
  situacaoDoStatus,
  texto,
} from '@nf-e/infrastructure/sefaz/consulta-protocolo';

export interface ParticipanteNfe {
  cnpjCpf: string;
  nome: string;
  municipio: string | null;
  uf: string | null;
}

export interface ItemNfe {
  codigo: string | null;
  descricao: string | null;
  ncm: string | null;
  cfop: string | null;
  unidade: string | null;
  quantidade: number | null;
  valorUnitario: number | null;
  valor: number | null;
}

export interface VolumesNfe {
  quantidade: number | null;
  especie: string | null;
  pesoLiquido: number | null;
  pesoBruto: number | null;
}

export interface NfeImportada {
  chave: string;
  numero: number;
  serie: number;
  modelo: number;
  naturezaOperacao: string | null;
  emitidoEm: string | null;
  emitente: ParticipanteNfe | null;
  destinatario: ParticipanteNfe | null;
  transportadora: ParticipanteNfe | null;
  valorProdutos: number | null;
  valorTotal: number | null;
  valorFrete: number | null;
  itens: ItemNfe[];
  volumes: VolumesNfe;
  pedido: string | null;
  informacoesComplementares: string | null;
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

const participante = (node: unknown, chaveEndereco: string): ParticipanteNfe | null => {
  if (!node || typeof node !== 'object') return null;

  const obj = node as Record<string, unknown>;
  const documento = texto(obj.CNPJ) ?? texto(obj.CPF);
  const nome = texto(obj.xNome);

  if (!documento && !nome) return null;

  const endereco = (buscarRecursivo(obj, chaveEndereco) ?? {}) as Record<string, unknown>;

  return {
    cnpjCpf: documento ?? '',
    nome: nome ?? '',
    // A transportadora traz xMun/UF direto, sem bloco de endereço.
    municipio: texto(endereco.xMun) ?? texto(obj.xMun),
    uf: texto(endereco.UF) ?? texto(obj.UF),
  };
};

/**
 * Lê o XML da NF-e, com ou sem o envelope nfeProc. A assinatura digital e o
 * certificado são ignorados: aqui interessa o conteúdo fiscal.
 */
export const parseNfeXml = (xml: string): NfeImportada => {
  let arvore: unknown;

  try {
    arvore = parser.parse(xml);
  } catch (error) {
    const motivo = error instanceof Error ? error.message : String(error);
    throw new BadRequestException(`XML inválido: ${motivo}`);
  }

  const infNFe = buscarRecursivo(arvore, 'infNFe');

  if (!infNFe) {
    throw new BadRequestException(
      'XML não é de uma NF-e: elemento infNFe não encontrado. Para CT-e use POST /cte/importar-xml.',
    );
  }

  const ide = buscarRecursivo(infNFe, 'ide') ?? {};
  const infProt = buscarRecursivo(arvore, 'infProt');
  const total = buscarRecursivo(infNFe, 'ICMSTot') ?? {};
  const transp = buscarRecursivo(infNFe, 'transp') ?? {};
  const vol = (buscarRecursivo(transp, 'vol') ?? {}) as Record<string, unknown>;

  // O parser descarta atributos, então a chave vem do protocolo ou do Id.
  const chave =
    (infProt ? texto(infProt.chNFe) : null) ?? /NFe(\d{44})/.exec(xml)?.[1] ?? null;

  if (!chave) {
    throw new BadRequestException('Não foi possível determinar a chave de acesso da NF-e.');
  }

  const documento = parseChaveAcesso(chave);

  if (documento.familia !== 'NFE') {
    throw new BadRequestException(
      `Esta chave é de ${documento.tipoDocumento}. Use POST /cte/importar-xml.`,
    );
  }

  const codigoStatus = infProt ? Number(infProt.cStat) : null;

  return {
    chave,
    numero: numero(ide.nNF) ?? documento.numero,
    serie: numero(ide.serie) ?? documento.serie,
    modelo: documento.modelo,
    naturezaOperacao: texto(ide.natOp),
    emitidoEm: texto(ide.dhEmi),
    emitente: participante(buscarRecursivo(infNFe, 'emit'), 'enderEmit'),
    destinatario: participante(buscarRecursivo(infNFe, 'dest'), 'enderDest'),
    transportadora: participante(buscarRecursivo(transp, 'transporta'), 'enderTransp'),
    valorProdutos: numero(total.vProd),
    valorTotal: numero(total.vNF),
    valorFrete: numero(total.vFrete),
    itens: lista(infNFe.det).map((item) => {
      const prod = (buscarRecursivo(item, 'prod') ?? {}) as Record<string, unknown>;

      return {
        codigo: texto(prod.cProd),
        descricao: texto(prod.xProd)?.replace(/\s{2,}/g, ' ').trim() ?? null,
        ncm: texto(prod.NCM),
        cfop: texto(prod.CFOP),
        unidade: texto(prod.uCom),
        quantidade: numero(prod.qCom),
        valorUnitario: numero(prod.vUnCom),
        valor: numero(prod.vProd),
      };
    }),
    volumes: {
      quantidade: numero(vol.qVol),
      especie: texto(vol.esp),
      pesoLiquido: numero(vol.pesoL),
      pesoBruto: numero(vol.pesoB),
    },
    pedido: texto((buscarRecursivo(infNFe, 'compra') ?? {}).xPed),
    informacoesComplementares:
      texto((buscarRecursivo(infNFe, 'infAdic') ?? {}).infCpl)?.replace(/\s{2,}/g, ' ').trim() ??
      null,
    protocolo: infProt ? texto(infProt.nProt) : null,
    autorizadoEm: infProt ? texto(infProt.dhRecbto) : null,
    situacao: codigoStatus ? situacaoDoStatus(codigoStatus) : null,
  };
};
