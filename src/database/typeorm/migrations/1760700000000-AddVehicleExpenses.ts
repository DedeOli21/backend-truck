import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVehicleExpenses1760700000000 implements MigrationInterface {
  name = 'AddVehicleExpenses1760700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE vehicle_expenses (
        id uuid PRIMARY KEY,
        truck_id uuid NOT NULL,
        driver_id uuid NOT NULL,
        category varchar(20) NOT NULL,
        description varchar(255),
        amount numeric(12,2) NOT NULL,
        spent_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_vehicle_expenses_truck FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE RESTRICT,
        CONSTRAINT fk_vehicle_expenses_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE RESTRICT,
        CONSTRAINT chk_vehicle_expenses_amount_positive CHECK (amount > 0)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_vehicle_expenses_truck ON vehicle_expenses (truck_id)`);
    await queryRunner.query(`CREATE INDEX idx_vehicle_expenses_driver ON vehicle_expenses (driver_id)`);
    await queryRunner.query(
      `CREATE INDEX idx_vehicle_expenses_spent_at ON vehicle_expenses (spent_at DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS vehicle_expenses`);
  }
}
