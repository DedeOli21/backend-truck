import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DriverOrmEntity } from '@database/typeorm/entities/driver.orm-entity';
import { TruckOrmEntity } from '@database/typeorm/entities/truck.orm-entity';

const numericTransformer = {
  to: (value: number) => value,
  from: (value: string | null) => (value === null ? 0 : Number(value)),
};

@Entity({ name: 'refuelings' })
export class RefuelingOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'truck_id', type: 'uuid' })
  truckId!: string;

  @ManyToOne(() => TruckOrmEntity)
  @JoinColumn({ name: 'truck_id' })
  truck!: TruckOrmEntity;

  @Column({ name: 'driver_id', type: 'uuid' })
  driverId!: string;

  @ManyToOne(() => DriverOrmEntity)
  @JoinColumn({ name: 'driver_id' })
  driver!: DriverOrmEntity;

  @Column({ type: 'numeric', precision: 10, scale: 3, transformer: numericTransformer })
  liters!: number;

  @Column({
    name: 'price_per_liter',
    type: 'numeric',
    precision: 10,
    scale: 3,
    transformer: numericTransformer,
  })
  pricePerLiter!: number;

  @Column({
    name: 'total_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  totalAmount!: number;

  @Column({ type: 'int' })
  odometer!: number;

  @Column({ name: 'gas_station_name', type: 'varchar', length: 150, nullable: true })
  gasStationName!: string | null;

  @Column({ name: 'refueled_at', type: 'timestamptz' })
  refueledAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
