import { InvoiceStatus } from '@database/typeorm/entities/enums';

export class InvoiceEntity {
  id!: string;
  ownerUserId!: string;
  customerId!: string;
  freightIds!: string[];
  totalAmount!: number;
  periodStart!: string;
  periodEnd!: string;
  status!: InvoiceStatus;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(props: Partial<InvoiceEntity>) {
    Object.assign(this, props);
  }
}
