import { ChaveAcesso } from '@nf-e/domain/value-objects/chave-acesso';

export const NFE_PROVIDER = 'NFE_PROVIDER';

export type SituacaoNfe = 'AUTORIZADA' | 'CANCELADA' | 'DENEGADA' | 'INEXISTENTE';

export interface ConsultaSefaz {
  situacao: SituacaoNfe;
  protocolo: string | null;
  dataAutorizacao: string | null;
  emitente: { cnpj: string; razaoSocial: string | null } | null;
  destinatario: { cnpjCpf: string; razaoSocial: string | null } | null;
  valorTotal: number | null;
  xmlUrl: string | null;
}

/**
 * Porta para a consulta na SEFAZ. A implementação real depende de certificado
 * digital A1/A3 e dos webservices por UF, que não estão configurados neste
 * ambiente — ver NotConfiguredNfeProvider.
 */
export interface NfeProvider {
  isConfigured(): boolean;
  consultarPorChave(chave: ChaveAcesso): Promise<ConsultaSefaz>;
  consultarPorNumero(uf: string, numero: number): Promise<ConsultaSefaz>;
}
