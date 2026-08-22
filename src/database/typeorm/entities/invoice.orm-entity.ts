import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { InvoiceStatus } from '@database/typeorm/entities/enums';

const numericTransformer = {
  to: (value: number) => value,
  from: (value: string | null) => (value === null ? 0 : Number(value)),
};

@Entity({ name: 'invoices' })
export class InvoiceOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  /** Gestor dono da fatura. Todo acesso é filtrado por ele. */
  @Column({ name: 'owner_user_id', type: 'uuid' })
  ownerUserId!: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  /** Ids dos fretes consolidados, na ordem em que entraram na fatura. */
  @Column({ name: 'freight_ids', type: 'text' })
  freightIds!: string;

  @Column({ name: 'total_amount', type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  totalAmount!: number;

  @Column({ name: 'period_start', type: 'date' })
  periodStart!: string;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd!: string;

  @Column({ type: 'varchar', length: 12 })
  status!: InvoiceStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
