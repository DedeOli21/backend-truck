import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCteChaveFinancial1761500000000 implements MigrationInterface {
  name = 'AddCteChaveFinancial1761500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "financial_transactions" ADD COLUMN IF NOT EXISTS "cte_chave" varchar(44)`,
    );
    // Um CT-e gera um único lançamento por gestor: reemitir ou reimportar atualiza,
    // nunca duplica o faturamento.
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_financial_transactions_owner_cte"
       ON "financial_transactions" ("owner_user_id", "cte_chave")
       WHERE "cte_chave" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_financial_transactions_owner_cte"`);
    await queryRunner.query(
      `ALTER TABLE "financial_transactions" DROP COLUMN IF EXISTS "cte_chave"`,
    );
  }
}
