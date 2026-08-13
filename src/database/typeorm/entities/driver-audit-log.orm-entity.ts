import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { DriverAuditAction } from '@database/typeorm/entities/enums';

@Entity({ name: 'driver_audit_logs' })
export class DriverAuditLogOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'driver_id', type: 'uuid' })
  driverId!: string;

  @Column({ type: 'enum', enum: DriverAuditAction })
  action!: DriverAuditAction;

  @Column({ name: 'actor_user_id', type: 'uuid' })
  actorUserId!: string;

  @Column({ name: 'payload_snapshot', type: 'jsonb' })
  payloadSnapshot!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
