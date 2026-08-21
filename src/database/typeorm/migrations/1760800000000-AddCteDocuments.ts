import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCteDocuments1760800000000 implements MigrationInterface {
  name = 'AddCteDocuments1760800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE cte_documents (
        id uuid PRIMARY KEY,
        chave varchar(44) UNIQUE NOT NULL,
        numero integer NOT NULL,
        serie integer NOT NULL,
        modelo integer NOT NULL,
        uf varchar(2) NOT NULL,
        cnpj_emitente varchar(14) NOT NULL,
        emitido_em timestamptz,
        cfop varchar(10),
        natureza_operacao varchar(255),
        origem varchar(150),
        destino varchar(150),
        remetente_nome varchar(255),
        remetente_documento varchar(20),
        destinatario_nome varchar(255),
        destinatario_documento varchar(20),
        tomador_nome varchar(255),
        tomador_documento varchar(20),
        valor_total_servico numeric(12,2),
        valor_receber numeric(12,2),
        valor_carga numeric(14,2),
        peso_bruto numeric(12,4),
        produto_predominante varchar(255),
        notas_fiscais text,
        rntrc varchar(20),
        placa varchar(10),
        protocolo varchar(20),
        autorizado_em timestamptz,
        situacao varchar(20),
        origem_leitura varchar(10) NOT NULL,
        truck_id uuid,
        driver_id uuid,
        -- Fretes ainda não existem no backend; a coluna fica pronta e sem FK
        -- até o módulo existir, quando vira uma FK de verdade.
        freight_id uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_cte_documents_truck FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE SET NULL,
        CONSTRAINT fk_cte_documents_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_cte_documents_emitido_em ON cte_documents (emitido_em DESC)`);
    await queryRunner.query(`CREATE INDEX idx_cte_documents_truck ON cte_documents (truck_id)`);
    await queryRunner.query(`CREATE INDEX idx_cte_documents_driver ON cte_documents (driver_id)`);
    await queryRunner.query(`CREATE INDEX idx_cte_documents_situacao ON cte_documents (situacao)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS cte_documents`);
  }
}
