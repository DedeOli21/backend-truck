import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeDriverPisNullable1760400000000 implements MigrationInterface {
  name = 'MakeDriverPisNullable1760400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE drivers ALTER COLUMN pis DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE drivers SET pis = '00000000000' WHERE pis IS NULL`);
    await queryRunner.query(`ALTER TABLE drivers ALTER COLUMN pis SET NOT NULL`);
  }
}
