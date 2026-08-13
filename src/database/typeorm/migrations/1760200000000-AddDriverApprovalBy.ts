import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDriverApprovalBy1760200000000 implements MigrationInterface {
  name = 'AddDriverApprovalBy1760200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Vínculo do usuário de login (DRIVER) com o motorista
    await queryRunner.query('ALTER TABLE users ADD COLUMN driver_id uuid');
    await queryRunner.query(
      'ALTER TABLE users ADD CONSTRAINT fk_users_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL',
    );
    await queryRunner.query('CREATE INDEX idx_users_driver_id ON users(driver_id)');

    // Gestor (admin) que aprovou o motorista
    await queryRunner.query(
      'ALTER TABLE drivers ADD COLUMN approved_by_user_id uuid',
    );
    await queryRunner.query(
      'ALTER TABLE drivers ADD CONSTRAINT fk_drivers_approved_by FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE SET NULL',
    );
    await queryRunner.query(
      'CREATE INDEX idx_drivers_approved_by ON drivers(approved_by_user_id)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_drivers_approved_by');
    await queryRunner.query(
      'ALTER TABLE drivers DROP CONSTRAINT IF EXISTS fk_drivers_approved_by',
    );
    await queryRunner.query('ALTER TABLE drivers DROP COLUMN IF EXISTS approved_by_user_id');

    await queryRunner.query('DROP INDEX IF EXISTS idx_users_driver_id');
    await queryRunner.query(
      'ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_driver',
    );
    await queryRunner.query('ALTER TABLE users DROP COLUMN IF EXISTS driver_id');
  }
}