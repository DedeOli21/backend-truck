import { TransactionEntity } from '@transactions/domain/entities/transaction.entity';
export declare const TRANSACTIONS_REPOSITORY = "TRANSACTIONS_REPOSITORY";
export interface TransactionsRepository {
    create(transaction: TransactionEntity): Promise<TransactionEntity>;
    findByUser(userId: string): Promise<TransactionEntity[]>;
}
