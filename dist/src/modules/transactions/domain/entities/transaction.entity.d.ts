export type TransactionType = 'FREIGHT' | 'FUEL';
export declare class TransactionEntity {
    readonly id: string;
    readonly userId: string;
    readonly type: TransactionType;
    readonly amount: number;
    readonly description: string;
    readonly createdAt: Date;
    constructor(id: string, userId: string, type: TransactionType, amount: number, description: string, createdAt: Date);
}
