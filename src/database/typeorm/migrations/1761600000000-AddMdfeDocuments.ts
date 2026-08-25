import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMdfeDocuments1761600000000 implements MigrationInterface {
  name = 'AddMdfeDocuments1761600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "mdfe_documents" (
        "id" uuid PRIMARY KEY,
        "owner_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "chave" varchar(44) NOT NULL,
        "numero" int NOT NULL,
        "serie" int NOT NULL,
        "modelo" int NOT NULL,
        "uf" varchar(2) NOT NULL,
        "cnpj_emitente" varchar(14) NOT NULL,
        "ambiente" smallint NOT NULL,
        "emitido_em" timestamptz,
        "uf_ini" varchar(2) NOT NULL,
        "uf_fim" varchar(2) NOT NULL,
        "municipio_carregamento" varchar(150),
        "municipio_descarga" varchar(150),
        "cte_chaves" text NOT NULL,
        "valor_carga" numeric(14,2),
        "peso_bruto_kg" numeric(12,4),
        "protocolo" varchar(20),
        "autorizado_em" timestamptz,
        "situacao" varchar(20),
        "motivo_rejeicao" varchar(255),
        "truck_id" uuid REFERENCES "trucks"("id") ON DELETE SET NULL,
        "driver_id" uuid REFERENCES "drivers"("id") ON DELETE SET NULL,
        "encerrado_em" timestamptz,
        "encerramento_protocolo" varchar(20),
        "xml" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_mdfe_documents_owner_chave" UNIQUE ("owner_user_id", "chave")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_mdfe_documents_owner_truck_driver"
       ON "mdfe_documents" ("owner_user_id", "truck_id", "driver_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "mdfe_numeracao" (
        "id" uuid PRIMARY KEY,
        "ambiente" smallint NOT NULL,
        "serie" integer NOT NULL,
        "ultimo_numero" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_mdfe_numeracao" UNIQUE ("ambiente", "serie")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "mdfe_numeracao"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "mdfe_documents"`);
  }
}
