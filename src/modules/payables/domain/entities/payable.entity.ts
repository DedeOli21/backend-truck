export type PayableCategory = 'MAINTENANCE' | 'INSURANCE' | 'FINANCING';

export class PayableEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly category: PayableCategory,
    public readonly description: string,
    public readonly amount: number,
    public readonly dueDate: Date,
    public readonly urgent: boolean,
    public paid: boolean,
    public paidAt: Date | null,
    public transactionId: string | null = null,
  ) {}
}





