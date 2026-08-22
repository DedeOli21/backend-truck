import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Multi-tenancy por gestor: cada registro de negócio passa a ter dono.
 *
 * O backfill dá tudo o que já existe ao ADMIN mais antigo, que é o único
 * gestor da base hoje. Sem isso a coluna não pode virar NOT NULL.
 */
const TABELAS = [
  'trucks',
  'drivers',
  'freights',
  'refuelings',
  'vehicle_expenses',
  'cte_documents',
  'driver_payments',
];

export class AddOwnerUserId1761200000000 implements MigrationInterface {
  name = 'AddOwnerUserId1761200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [primeiroAdmin] = await queryRunner.query(
      `SELECT "id" FROM "users" WHERE "role" = 'ADMIN' ORDER BY "created_at" ASC LIMIT 1`,
    );

    for (const tabela of TABELAS) {
      await queryRunner.query(
        `ALTER TABLE "${tabela}" ADD COLUMN IF NOT EXISTS "owner_user_id" uuid`,
      );

      if (primeiroAdmin) {
        await queryRunner.query(
          `UPDATE "${tabela}" SET "owner_user_id" = $1 WHERE "owner_user_id" IS NULL`,
          [primeiroAdmin.id],
        );
      }

      // Linhas órfãs só existiriam numa base sem nenhum ADMIN — nada a preservar.
      await queryRunner.query(`DELETE FROM "${tabela}" WHERE "owner_user_id" IS NULL`);

      await queryRunner.query(
        `ALTER TABLE "${tabela}" ALTER COLUMN "owner_user_id" SET NOT NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE "${tabela}" DROP CONSTRAINT IF EXISTS "fk_${tabela}_owner"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${tabela}" ADD CONSTRAINT "fk_${tabela}_owner"
         FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "idx_${tabela}_owner" ON "${tabela}" ("owner_user_id")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const tabela of TABELAS) {
      await queryRunner.query(`DROP INDEX IF EXISTS "idx_${tabela}_owner"`);
      await queryRunner.query(
        `ALTER TABLE "${tabela}" DROP CONSTRAINT IF EXISTS "fk_${tabela}_owner"`,
      );
      await queryRunner.query(`ALTER TABLE "${tabela}" DROP COLUMN IF EXISTS "owner_user_id"`);
    }
  }
}
