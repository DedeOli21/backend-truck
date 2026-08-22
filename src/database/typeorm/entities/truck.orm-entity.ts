import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DriverOrmEntity } from '@database/typeorm/entities/driver.orm-entity';
import { TransactionOrmEntity } from '@database/typeorm/entities/transaction.orm-entity';
import { TruckStatus, TruckType } from '@database/typeorm/entities/enums';

const numericTransformer = {
  to: (value: number) => value,
  from: (value: string | null) => (value === null ? 0 : Number(value)),
};

@Entity({ name: 'trucks' })
export class TruckOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  /** Gestor dono do registro. Todo acesso é filtrado por ele. */
  @Column({ name: 'owner_user_id', type: 'uuid' })
  ownerUserId!: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  plate!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  rntrc!: string | null;

  @Column({ name: 'brand_model', type: 'varchar', length: 120 })
  brandModel!: string;

  @Column({ type: 'int', nullable: true })
  year!: number | null;

  @Column({ type: 'varchar', length: 20, default: TruckType.TRUCK })
  type!: TruckType;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0, transformer: numericTransformer })
  capacity!: number;

  @Column({ type: 'varchar', length: 20, default: TruckStatus.ATIVO })
  status!: TruckStatus;

  @Column({ name: 'driver_id', type: 'uuid', nullable: true })
  driverId!: string | null;

  @ManyToOne(() => DriverOrmEntity, { nullable: true })
  @JoinColumn({ name: 'driver_id' })
  driver!: DriverOrmEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => TransactionOrmEntity, (transaction) => transaction.truck)
  transactions!: TransactionOrmEntity[];
}




