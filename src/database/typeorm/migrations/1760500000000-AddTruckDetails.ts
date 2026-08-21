import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTruckDetails1760500000000 implements MigrationInterface {
  name = 'AddTruckDetails1760500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE trucks ADD COLUMN type varchar(20) NOT NULL DEFAULT 'TRUCK'`);
    await queryRunner.query(`ALTER TABLE trucks ADD COLUMN capacity numeric(10,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE trucks ADD COLUMN status varchar(20) NOT NULL DEFAULT 'ATIVO'`);

    // driver_id apontava para users(id); os motoristas vivem em drivers.
    // Zera o que nao existir em drivers para a nova FK poder ser criada.
    await queryRunner.query(`ALTER TABLE trucks DROP CONSTRAINT IF EXISTS fk_trucks_driver`);
    await queryRunner.query(`
      UPDATE trucks
      SET driver_id = NULL
      WHERE driver_id IS NOT NULL
        AND driver_id NOT IN (SELECT id FROM drivers)
    `);
    await queryRunner.query(`
      ALTER TABLE trucks
      ADD CONSTRAINT fk_trucks_driver
      FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE trucks DROP CONSTRAINT IF EXISTS fk_trucks_driver`);
    await queryRunner.query(`
      UPDATE trucks
      SET driver_id = NULL
      WHERE driver_id IS NOT NULL
        AND driver_id NOT IN (SELECT id FROM users)
    `);
    await queryRunner.query(`
      ALTER TABLE trucks
      ADD CONSTRAINT fk_trucks_driver
      FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE SET NULL
    `);
    await queryRunner.query(`ALTER TABLE trucks DROP COLUMN IF EXISTS status`);
    await queryRunner.query(`ALTER TABLE trucks DROP COLUMN IF EXISTS capacity`);
    await queryRunner.query(`ALTER TABLE trucks DROP COLUMN IF EXISTS type`);
  }
}
