import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFinancial1761300000000 implements MigrationInterface {
  name = 'AddFinancial1761300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "financial_transactions" (
        "id" uuid PRIMARY KEY,
        "owner_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "type" varchar(10) NOT NULL,
        "category" varchar(80) NOT NULL,
        "description" varchar(255) NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "due_date" date NOT NULL,
        "paid_at" date,
        "bank_account" varchar(120),
        "customer_id" uuid REFERENCES "customers"("id") ON DELETE SET NULL,
        "supplier_id" uuid REFERENCES "suppliers"("id") ON DELETE SET NULL,
        "freight_id" uuid REFERENCES "freights"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_financial_transactions_owner_due"
       ON "financial_transactions" ("owner_user_id", "due_date")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "invoices" (
        "id" uuid PRIMARY KEY,
        "owner_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
        "freight_ids" text NOT NULL,
        "total_amount" numeric(12,2) NOT NULL,
        "period_start" date NOT NULL,
        "period_end" date NOT NULL,
        "status" varchar(12) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_invoices_owner" ON "invoices" ("owner_user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "invoices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "financial_transactions"`);
  }
}
