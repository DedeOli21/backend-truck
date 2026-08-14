import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDriverPayments1760300000000 implements MigrationInterface {
  name = 'AddDriverPayments1760300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE trucks ADD COLUMN rntrc varchar(20)');
    await queryRunner.query("CREATE TYPE toll_status AS ENUM ('PAID', 'UNPAID')");
    await queryRunner.query("CREATE TYPE driver_payment_status AS ENUM ('PENDING', 'PAID')");
    await queryRunner.query(
      "CREATE TYPE driver_payment_audit_action AS ENUM ('CREATED', 'UPDATED', 'PAYMENT_EXECUTED', 'DELETED')",
    );

    await queryRunner.query(`
      CREATE TABLE driver_payments (
        id uuid PRIMARY KEY,
        driver_id uuid NOT NULL,
        driver_name varchar(160) NOT NULL,
        vehicle_plate varchar(20),
        rntrc varchar(20),
        pix_key_type pix_key_type,
        pix_key varchar(255) NOT NULL,
        base_amount numeric(12, 2) NOT NULL,
        inss_amount numeric(12, 2) NOT NULL,
        sest_senat_amount numeric(12, 2) NOT NULL,
        toll_amount numeric(12, 2) NOT NULL DEFAULT 0,
        total_amount numeric(12, 2) NOT NULL,
        toll_status toll_status NOT NULL DEFAULT 'UNPAID',
        payment_status driver_payment_status NOT NULL DEFAULT 'PENDING',
        paid_at timestamptz,
        loading_date date NOT NULL,
        delivery_date date NOT NULL,
        client_name varchar(160) NOT NULL,
        created_by_user_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_driver_payment_base_positive CHECK (base_amount > 0),
        CONSTRAINT chk_driver_payment_delivery_after_loading CHECK (delivery_date >= loading_date),
        CONSTRAINT fk_driver_payments_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE RESTRICT,
        CONSTRAINT fk_driver_payments_actor FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE driver_payment_audit_logs (
        id uuid PRIMARY KEY,
        driver_payment_id uuid NOT NULL,
        action driver_payment_audit_action NOT NULL,
        actor_user_id uuid NOT NULL,
        payload_snapshot jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_driver_payment_audit_payment FOREIGN KEY (driver_payment_id) REFERENCES driver_payments(id) ON DELETE CASCADE,
        CONSTRAINT fk_driver_payment_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE RESTRICT
      )
    `);

    await queryRunner.query('CREATE INDEX idx_driver_payments_driver_id ON driver_payments(driver_id)');
    await queryRunner.query('CREATE INDEX idx_driver_payments_loading_date ON driver_payments(loading_date)');
    await queryRunner.query('CREATE INDEX idx_driver_payments_delivery_date ON driver_payments(delivery_date)');
    await queryRunner.query(
      'CREATE INDEX idx_driver_payment_audit_logs_payment_id ON driver_payment_audit_logs(driver_payment_id, created_at DESC)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_driver_payment_audit_logs_payment_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_driver_payments_delivery_date');
    await queryRunner.query('DROP INDEX IF EXISTS idx_driver_payments_loading_date');
    await queryRunner.query('DROP INDEX IF EXISTS idx_driver_payments_driver_id');

    await queryRunner.query('DROP TABLE IF EXISTS driver_payment_audit_logs');
    await queryRunner.query('DROP TABLE IF EXISTS driver_payments');

    await queryRunner.query('DROP TYPE IF EXISTS driver_payment_audit_action');
    await queryRunner.query('DROP TYPE IF EXISTS driver_payment_status');
    await queryRunner.query('DROP TYPE IF EXISTS toll_status');

    await queryRunner.query('ALTER TABLE trucks DROP COLUMN IF EXISTS rntrc');
  }
}
