import { FinancialTransactionType } from '@database/typeorm/entities/enums';

export class FinancialTransactionEntity {
  id!: string;
  ownerUserId!: string;
  type!: FinancialTransactionType;
  category!: string;
  description!: string;
  amount!: number;
  /** Data em ISO (YYYY-MM-DD): vencimento é dia, não instante. */
  dueDate!: string;
  paidAt!: string | null;
  bankAccount!: string | null;
  customerId!: string | null;
  supplierId!: string | null;
  freightId!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(props: Partial<FinancialTransactionEntity>) {
    Object.assign(this, props);
  }
}
