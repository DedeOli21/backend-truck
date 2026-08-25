export const MDFE_NUMERACAO_REPOSITORY = 'MDFE_NUMERACAO_REPOSITORY';

export interface MdfeNumeracaoRepository {
  /** Reserva o próximo número da série de forma atômica: dois pedidos simultâneos nunca recebem o mesmo. */
  proximoNumero(ambiente: number, serie: number): Promise<number>;
}
