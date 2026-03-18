import { TransactionEntity } from '@transactions/domain/entities/transaction.entity';
import { TransactionsRepository } from '@transactions/domain/repositories/transactions.repository';
export declare class InMemoryTransactionsRepository implements TransactionsRepository {
    private readonly store;
    create(transaction: TransactionEntity): Promise<TransactionEntity>;
    findByUser(userId: string): Promise<TransactionEntity[]>;
}
