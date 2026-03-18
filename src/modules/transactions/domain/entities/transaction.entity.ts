export type TransactionType = 'FREIGHT' | 'FUEL';

export class TransactionEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly type: TransactionType,
    public readonly amount: number,
    public readonly description: string,
    public readonly createdAt: Date,
  ) {}
}





