import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDrivers1760100000000 implements MigrationInterface {
  name = 'AddDrivers1760100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("CREATE TYPE driver_status AS ENUM ('EM_ANALISE', 'APROVADO', 'REPROVADO')");
    await queryRunner.query("CREATE TYPE cnh_category AS ENUM ('A', 'B', 'C', 'D', 'E')");
    await queryRunner.query(
      "CREATE TYPE pix_key_type AS ENUM ('CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM')",
    );
    await queryRunner.query(
      "CREATE TYPE driver_audit_action AS ENUM ('CREATED', 'UPDATED', 'STATUS_CHANGED')",
    );

    await queryRunner.query(`
      CREATE TABLE drivers (
        id uuid PRIMARY KEY,
        user_id uuid UNIQUE,
        full_name varchar(150) NOT NULL,
        cpf varchar(11) UNIQUE NOT NULL,
        pis varchar(11) NOT NULL,
        address_street varchar(255) NOT NULL,
        address_number varchar(20) NOT NULL,
        address_complement varchar(255),
        address_neighborhood varchar(150) NOT NULL,
        address_city varchar(150) NOT NULL,
        address_state varchar(2) NOT NULL,
        address_zip varchar(8) NOT NULL,
        cnh_number varchar(30) NOT NULL,
        cnh_category cnh_category NOT NULL,
        cnh_expires_at date NOT NULL,
        cnh_image_path varchar(500),
        pix_key_type pix_key_type NOT NULL,
        pix_key varchar(255) NOT NULL,
        status driver_status NOT NULL DEFAULT 'EM_ANALISE',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_drivers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE driver_reference_contacts (
        id uuid PRIMARY KEY,
        driver_id uuid NOT NULL,
        name varchar(150) NOT NULL,
        phone varchar(11) NOT NULL,
        relationship varchar(100) NOT NULL,
        CONSTRAINT fk_contacts_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE driver_audit_logs (
        id uuid PRIMARY KEY,
        driver_id uuid NOT NULL,
        action driver_audit_action NOT NULL,
        actor_user_id uuid NOT NULL,
        payload_snapshot jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_audit_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
        CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(
      'CREATE INDEX idx_driver_contacts_driver_id ON driver_reference_contacts(driver_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_driver_audit_logs_driver_id ON driver_audit_logs(driver_id, created_at DESC)',
    );
    await queryRunner.query('CREATE INDEX idx_drivers_status ON drivers(status)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_drivers_status');
    await queryRunner.query('DROP INDEX IF EXISTS idx_driver_audit_logs_driver_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_driver_contacts_driver_id');

    await queryRunner.query('DROP TABLE IF EXISTS driver_audit_logs');
    await queryRunner.query('DROP TABLE IF EXISTS driver_reference_contacts');
    await queryRunner.query('DROP TABLE IF EXISTS drivers');

    await queryRunner.query('DROP TYPE IF EXISTS driver_audit_action');
    await queryRunner.query('DROP TYPE IF EXISTS pix_key_type');
    await queryRunner.query('DROP TYPE IF EXISTS cnh_category');
    await queryRunner.query('DROP TYPE IF EXISTS driver_status');
  }
}
