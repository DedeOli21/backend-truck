import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { NumeracaoRepository } from '@nf-e/infrastructure/emissao/numeracao.repository';

@Injectable()
export class PostgresNumeracaoRepository implements NumeracaoRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async proximoNumero(ambiente: number, serie: number): Promise<number> {
    // UPDATE ... RETURNING resolve a corrida no próprio banco: quem chegar
    // depois espera o lock da linha e recebe o número seguinte.
    const atualizado = await this.dataSource.query(
      `UPDATE cte_numeracao SET ultimo_numero = ultimo_numero + 1, updated_at = now()
       WHERE ambiente = $1 AND serie = $2 RETURNING ultimo_numero`,
      [ambiente, serie],
    );

    if (atualizado?.[0]?.ultimo_numero) {
      return Number(atualizado[0].ultimo_numero);
    }

    const criado = await this.dataSource.query(
      `INSERT INTO cte_numeracao (id, ambiente, serie, ultimo_numero)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (ambiente, serie) DO UPDATE SET ultimo_numero = cte_numeracao.ultimo_numero + 1
       RETURNING ultimo_numero`,
      [randomUUID(), ambiente, serie],
    );

    return Number(criado[0].ultimo_numero);
  }
}
