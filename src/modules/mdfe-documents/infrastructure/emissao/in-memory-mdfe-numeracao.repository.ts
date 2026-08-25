import { Injectable } from '@nestjs/common';
import { MdfeNumeracaoRepository } from '@mdfe-documents/infrastructure/emissao/mdfe-numeracao.repository';

@Injectable()
export class InMemoryMdfeNumeracaoRepository implements MdfeNumeracaoRepository {
  private readonly series = new Map<string, number>();

  async proximoNumero(ambiente: number, serie: number): Promise<number> {
    const chave = `${ambiente}:${serie}`;
    const proximo = (this.series.get(chave) ?? 0) + 1;

    this.series.set(chave, proximo);
    return proximo;
  }
}
