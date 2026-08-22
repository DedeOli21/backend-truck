import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCteEmissao1761000000000 implements MigrationInterface {
  name = 'AddCteEmissao1761000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Numeração por série e ambiente: homologação e produção têm sequências
    // separadas, e o número não pode repetir dentro de cada uma.
    await queryRunner.query(`
      CREATE TABLE cte_numeracao (
        id uuid PRIMARY KEY,
        ambiente smallint NOT NULL,
        serie integer NOT NULL,
        ultimo_numero integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_cte_numeracao UNIQUE (ambiente, serie)
      )
    `);

    await queryRunner.query(`ALTER TABLE cte_documents ADD COLUMN emitido_por_nos boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE cte_documents ADD COLUMN ambiente smallint`);
    await queryRunner.query(`ALTER TABLE cte_documents ADD COLUMN xml text`);
    await queryRunner.query(`ALTER TABLE cte_documents ADD COLUMN motivo_rejeicao varchar(255)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE cte_documents DROP COLUMN IF EXISTS motivo_rejeicao`);
    await queryRunner.query(`ALTER TABLE cte_documents DROP COLUMN IF EXISTS xml`);
    await queryRunner.query(`ALTER TABLE cte_documents DROP COLUMN IF EXISTS ambiente`);
    await queryRunner.query(`ALTER TABLE cte_documents DROP COLUMN IF EXISTS emitido_por_nos`);
    await queryRunner.query(`DROP TABLE IF EXISTS cte_numeracao`);
  }
}
