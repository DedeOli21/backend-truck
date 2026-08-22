import { FreightExpenseType } from '@database/typeorm/entities/enums';

export class FreightExpenseEntity {
  id!: string;
  freightId!: string;
  type!: FreightExpenseType;
  amount!: number;
  description!: string | null;
  receiptUrl!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(props: Partial<FreightExpenseEntity>) {
    Object.assign(this, props);
  }
}
