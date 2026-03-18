export type PayableCategory = 'MAINTENANCE' | 'INSURANCE' | 'FINANCING';
export declare class PayableEntity {
    readonly id: string;
    readonly userId: string;
    readonly category: PayableCategory;
    readonly description: string;
    readonly amount: number;
    readonly dueDate: Date;
    readonly urgent: boolean;
    paid: boolean;
    paidAt: Date | null;
    transactionId: string | null;
    constructor(id: string, userId: string, category: PayableCategory, description: string, amount: number, dueDate: Date, urgent: boolean, paid: boolean, paidAt: Date | null, transactionId?: string | null);
}
