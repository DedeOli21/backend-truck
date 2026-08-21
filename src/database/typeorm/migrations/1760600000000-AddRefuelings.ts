import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefuelings1760600000000 implements MigrationInterface {
  name = 'AddRefuelings1760600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE refuelings (
        id uuid PRIMARY KEY,
        truck_id uuid NOT NULL,
        driver_id uuid NOT NULL,
        liters numeric(10,3) NOT NULL,
        price_per_liter numeric(10,3) NOT NULL,
        total_amount numeric(12,2) NOT NULL,
        odometer integer NOT NULL,
        gas_station_name varchar(150),
        refueled_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_refuelings_truck FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE RESTRICT,
        CONSTRAINT fk_refuelings_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE RESTRICT,
        CONSTRAINT chk_refuelings_liters_positive CHECK (liters > 0),
        CONSTRAINT chk_refuelings_total_positive CHECK (total_amount > 0),
        CONSTRAINT chk_refuelings_odometer_non_negative CHECK (odometer >= 0)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_refuelings_truck_odometer ON refuelings (truck_id, odometer)`,
    );
    await queryRunner.query(`CREATE INDEX idx_refuelings_driver ON refuelings (driver_id)`);
    await queryRunner.query(`CREATE INDEX idx_refuelings_refueled_at ON refuelings (refueled_at DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS refuelings`);
  }
}
