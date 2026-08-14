import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  DriverPaymentStatus,
  PixKeyType,
  TollStatus,
} from '@database/typeorm/entities/enums';

@Entity({ name: 'driver_payments' })
export class DriverPaymentOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'driver_id', type: 'uuid' })
  driverId!: string;

  @Column({ name: 'driver_name', type: 'varchar', length: 160 })
  driverName!: string;

  @Column({ name: 'vehicle_plate', type: 'varchar', length: 20, nullable: true })
  vehiclePlate!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  rntrc!: string | null;

  @Column({ name: 'pix_key_type', type: 'enum', enum: PixKeyType, nullable: true })
  pixKeyType!: PixKeyType | null;

  @Column({ name: 'pix_key', type: 'varchar', length: 255 })
  pixKey!: string;

  @Column({ name: 'base_amount', type: 'numeric', precision: 12, scale: 2 })
  baseAmount!: string;

  @Column({ name: 'inss_amount', type: 'numeric', precision: 12, scale: 2 })
  inssAmount!: string;

  @Column({ name: 'sest_senat_amount', type: 'numeric', precision: 12, scale: 2 })
  sestSenatAmount!: string;

  @Column({ name: 'toll_amount', type: 'numeric', precision: 12, scale: 2 })
  tollAmount!: string;

  @Column({ name: 'total_amount', type: 'numeric', precision: 12, scale: 2 })
  totalAmount!: string;

  @Column({ name: 'toll_status', type: 'enum', enum: TollStatus, default: TollStatus.UNPAID })
  tollStatus!: TollStatus;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: DriverPaymentStatus,
    default: DriverPaymentStatus.PENDING,
  })
  paymentStatus!: DriverPaymentStatus;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'loading_date', type: 'date' })
  loadingDate!: string;

  @Column({ name: 'delivery_date', type: 'date' })
  deliveryDate!: string;

  @Column({ name: 'client_name', type: 'varchar', length: 160 })
  clientName!: string;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
