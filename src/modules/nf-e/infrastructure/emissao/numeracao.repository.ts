export const NUMERACAO_REPOSITORY = 'NUMERACAO_REPOSITORY';

export interface NumeracaoRepository {
  /** Reserva o próximo número da série de forma atômica: dois pedidos simultâneos nunca recebem o mesmo. */
  proximoNumero(ambiente: number, serie: number): Promise<number>;
}
