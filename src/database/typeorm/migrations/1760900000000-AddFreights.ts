import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFreights1760900000000 implements MigrationInterface {
  name = 'AddFreights1760900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE freights (
        id uuid PRIMARY KEY,
        codigo varchar(30) UNIQUE NOT NULL,
        origem varchar(150) NOT NULL,
        destino varchar(150) NOT NULL,
        cliente_nome varchar(255),
        cliente_documento varchar(20),
        remetente_nome varchar(255),
        destinatario_nome varchar(255),
        produto varchar(255),
        peso numeric(12,4),
        valor_frete numeric(12,2) NOT NULL DEFAULT 0,
        valor_carga numeric(14,2),
        status varchar(20) NOT NULL DEFAULT 'AGENDADO',
        truck_id uuid,
        driver_id uuid,
        iniciado_em timestamptz,
        concluido_em timestamptz,
        observacoes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_freights_truck FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE SET NULL,
        CONSTRAINT fk_freights_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
        CONSTRAINT chk_freights_status CHECK (status IN ('AGENDADO','EM_TRANSITO','CONCLUIDO','CANCELADO'))
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_freights_status ON freights (status)`);
    await queryRunner.query(`CREATE INDEX idx_freights_truck ON freights (truck_id)`);
    await queryRunner.query(`CREATE INDEX idx_freights_driver ON freights (driver_id)`);
    await queryRunner.query(`CREATE INDEX idx_freights_created ON freights (created_at DESC)`);

    // freight_id em cte_documents existia sem FK porque fretes não existiam.
    // Agora a referência passa a ser verificada pelo banco.
    await queryRunner.query(`
      UPDATE cte_documents SET freight_id = NULL
      WHERE freight_id IS NOT NULL AND freight_id NOT IN (SELECT id FROM freights)
    `);
    await queryRunner.query(`
      ALTER TABLE cte_documents
      ADD CONSTRAINT fk_cte_documents_freight
      FOREIGN KEY (freight_id) REFERENCES freights(id) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE cte_documents DROP CONSTRAINT IF EXISTS fk_cte_documents_freight`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS freights`);
  }
}
