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
import { UserOrmEntity } from '@database/typeorm/entities/user.orm-entity';
import { TransactionOrmEntity } from '@database/typeorm/entities/transaction.orm-entity';

@Entity({ name: 'trucks' })
export class TruckOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  plate!: string;

  @Column({ name: 'brand_model', type: 'varchar', length: 120 })
  brandModel!: string;

  @Column({ type: 'int', nullable: true })
  year!: number | null;

  @Column({ name: 'driver_id', type: 'uuid', nullable: true })
  driverId!: string | null;

  @ManyToOne(() => UserOrmEntity, (user) => user.trucks, { nullable: true })
  @JoinColumn({ name: 'driver_id' })
  driver!: UserOrmEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => TransactionOrmEntity, (transaction) => transaction.truck)
  transactions!: TransactionOrmEntity[];
}




