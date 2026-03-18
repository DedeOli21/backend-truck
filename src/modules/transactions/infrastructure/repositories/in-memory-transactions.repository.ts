import { Injectable } from '@nestjs/common';
import { TransactionEntity } from '@transactions/domain/entities/transaction.entity';
import { TransactionsRepository } from '@transactions/domain/repositories/transactions.repository';

@Injectable()
export class InMemoryTransactionsRepository implements TransactionsRepository {
  private readonly store = new Map<string, TransactionEntity[]>();

  async create(transaction: TransactionEntity): Promise<TransactionEntity> {
    const transactions = this.store.get(transaction.userId) ?? [];
    transactions.push(transaction);
    this.store.set(transaction.userId, transactions);
    return transaction;
  }

  async findByUser(userId: string): Promise<TransactionEntity[]> {
    return this.store.get(userId) ?? [];
  }
}





