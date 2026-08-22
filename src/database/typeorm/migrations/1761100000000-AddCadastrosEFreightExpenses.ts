import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCadastrosEFreightExpenses1761100000000 implements MigrationInterface {
  name = 'AddCadastrosEFreightExpenses1761100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customers" (
        "id" uuid PRIMARY KEY,
        "owner_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "name" varchar(160) NOT NULL,
        "tax_id" varchar(18) NOT NULL,
        "phone" varchar(20) NOT NULL,
        "address" varchar(255) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_customers_owner" ON "customers" ("owner_user_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "suppliers" (
        "id" uuid PRIMARY KEY,
        "owner_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "name" varchar(160) NOT NULL,
        "tax_id" varchar(18) NOT NULL,
        "service_type" varchar(120) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_suppliers_owner" ON "suppliers" ("owner_user_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fleet_routes" (
        "id" uuid PRIMARY KEY,
        "owner_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "route_name" varchar(160) NOT NULL,
        "origin" varchar(160) NOT NULL,
        "destination" varchar(160) NOT NULL,
        "distance_km" numeric(10,2) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_fleet_routes_owner" ON "fleet_routes" ("owner_user_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "freight_expenses" (
        "id" uuid PRIMARY KEY,
        "freight_id" uuid NOT NULL REFERENCES "freights"("id") ON DELETE CASCADE,
        "type" varchar(20) NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "description" varchar(255),
        "receipt_url" varchar(500),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_freight_expenses_freight" ON "freight_expenses" ("freight_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "freight_timeline_events" (
        "id" uuid PRIMARY KEY,
        "freight_id" uuid NOT NULL REFERENCES "freights"("id") ON DELETE CASCADE,
        "title" varchar(120) NOT NULL,
        "description" varchar(500),
        "status" varchar(20) NOT NULL,
        "updated_by" varchar(160) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_freight_timeline_freight" ON "freight_timeline_events" ("freight_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "freight_timeline_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "freight_expenses"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fleet_routes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "suppliers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customers"`);
  }
}
