import { ParticipanteCte } from '@nf-e/domain/emissao/gerar-cte-xml';

export const EMISSOR_CONFIG = 'EMISSOR_CONFIG';

export interface EmissorConfig {
  ambiente: 1 | 2;
  serie: number;
  codigoMunicipioPadrao: string;
  emitente: ParticipanteCte & { inscricaoEstadual: string; crt: 1 | 2 | 3; rntrc?: string | null };
  /** Seguro da carga: obrigatório na emissão de MDF-e. */
  seguro: { seguradoraNome: string; seguradoraCnpj: string; apolice: string };
}

/**
 * Dados do emitente vêm do ambiente porque são da empresa, não do código.
 * Sem eles a emissão não sobe — melhor falhar no boot do que emitir errado.
 */
export const lerEmissorConfig = (env: NodeJS.ProcessEnv = process.env): EmissorConfig => ({
  ambiente: env.CTE_AMBIENTE === '1' ? 1 : 2,
  serie: Number(env.CTE_SERIE) || 1,
  codigoMunicipioPadrao: env.CTE_EMIT_COD_MUNICIPIO ?? '3534401',
  emitente: {
    cnpjCpf: env.CTE_EMIT_CNPJ ?? '',
    inscricaoEstadual: env.CTE_EMIT_IE ?? '',
    nome: env.CTE_EMIT_NOME ?? '',
    crt: (Number(env.CTE_EMIT_CRT) || 1) as 1 | 2 | 3,
    rntrc: env.CTE_EMIT_RNTRC ?? null,
    fone: env.CTE_EMIT_FONE ?? null,
    endereco: {
      logradouro: env.CTE_EMIT_LOGRADOURO ?? '',
      numero: env.CTE_EMIT_NUMERO ?? 'S/N',
      bairro: env.CTE_EMIT_BAIRRO ?? '',
      codigoMunicipio: env.CTE_EMIT_COD_MUNICIPIO ?? '3534401',
      municipio: env.CTE_EMIT_MUNICIPIO ?? '',
      cep: env.CTE_EMIT_CEP ?? '',
      uf: env.CTE_EMIT_UF ?? 'SP',
    },
  },
  seguro: {
    // Sem seguradora contratada configurada, a emissão de MDF-e em produção
    // (ambiente 1) fica bloqueada nos campos abaixo — homologação aceita
    // qualquer CNPJ/apólice, sem valor fiscal.
    seguradoraNome: env.MDFE_SEGURADORA_NOME ?? '',
    seguradoraCnpj: env.MDFE_SEGURADORA_CNPJ ?? '',
    apolice: env.MDFE_APOLICE_NUMERO ?? '',
  },
});

export const emissorConfigurado = (config: EmissorConfig): boolean =>
  Boolean(config.emitente.cnpjCpf && config.emitente.inscricaoEstadual && config.emitente.nome);
