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
import { VehicleExpenseCategory } from '@database/typeorm/entities/enums';

const numericTransformer = {
  to: (value: number) => value,
  from: (value: string | null) => (value === null ? 0 : Number(value)),
};

@Entity({ name: 'vehicle_expenses' })
export class VehicleExpenseOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  /** Gestor dono do registro. Todo acesso é filtrado por ele. */
  @Column({ name: 'owner_user_id', type: 'uuid' })
  ownerUserId!: string;

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

  @Column({ type: 'varchar', length: 20 })
  category!: VehicleExpenseCategory;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  amount!: number;

  @Column({ name: 'spent_at', type: 'timestamptz' })
  spentAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
