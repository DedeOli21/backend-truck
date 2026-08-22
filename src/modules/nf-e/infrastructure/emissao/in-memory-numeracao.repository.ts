import { Injectable } from '@nestjs/common';
import { NumeracaoRepository } from '@nf-e/infrastructure/emissao/numeracao.repository';

@Injectable()
export class InMemoryNumeracaoRepository implements NumeracaoRepository {
  private readonly series = new Map<string, number>();

  async proximoNumero(ambiente: number, serie: number): Promise<number> {
    const chave = `${ambiente}:${serie}`;
    const proximo = (this.series.get(chave) ?? 0) + 1;

    this.series.set(chave, proximo);
    return proximo;
  }
}
