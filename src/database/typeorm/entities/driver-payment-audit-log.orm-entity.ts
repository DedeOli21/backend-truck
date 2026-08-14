import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { DriverPaymentAuditAction } from '@database/typeorm/entities/enums';

@Entity({ name: 'driver_payment_audit_logs' })
export class DriverPaymentAuditLogOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'driver_payment_id', type: 'uuid' })
  driverPaymentId!: string;

  @Column({ type: 'enum', enum: DriverPaymentAuditAction })
  action!: DriverPaymentAuditAction;

  @Column({ name: 'actor_user_id', type: 'uuid' })
  actorUserId!: string;

  @Column({ name: 'payload_snapshot', type: 'jsonb' })
  payloadSnapshot!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
