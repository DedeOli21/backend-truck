import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { FinancialTransactionType } from '@database/typeorm/entities/enums';

const numericTransformer = {
  to: (value: number) => value,
  from: (value: string | null) => (value === null ? 0 : Number(value)),
};

@Entity({ name: 'financial_transactions' })
export class FinancialTransactionOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  /** Gestor dono do lançamento. Todo acesso é filtrado por ele. */
  @Column({ name: 'owner_user_id', type: 'uuid' })
  ownerUserId!: string;

  @Column({ type: 'varchar', length: 10 })
  type!: FinancialTransactionType;

  @Column({ type: 'varchar', length: 80 })
  category!: string;

  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  amount!: number;

  @Column({ name: 'due_date', type: 'date' })
  dueDate!: string;

  @Column({ name: 'paid_at', type: 'date', nullable: true })
  paidAt!: string | null;

  @Column({ name: 'bank_account', type: 'varchar', length: 120, nullable: true })
  bankAccount!: string | null;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId!: string | null;

  @Column({ name: 'supplier_id', type: 'uuid', nullable: true })
  supplierId!: string | null;

  @Column({ name: 'freight_id', type: 'uuid', nullable: true })
  freightId!: string | null;

  @Column({ name: 'cte_chave', type: 'varchar', length: 44, nullable: true })
  cteChave!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
