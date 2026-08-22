import { Injectable } from '@nestjs/common';
import { FinancialTransactionEntity } from '@applications/financial/domain/entities/financial-transaction.entity';
import { InvoiceEntity } from '@applications/financial/domain/entities/invoice.entity';
import {
  FinancialTransactionFilters,
  FinancialTransactionsRepository,
  InvoicesRepository,
} from '@applications/financial/domain/repositories/financial.repository';

@Injectable()
export class InMemoryFinancialTransactionsRepository implements FinancialTransactionsRepository {
  private readonly transactions = new Map<string, FinancialTransactionEntity>();

  async create(transaction: FinancialTransactionEntity): Promise<FinancialTransactionEntity> {
    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  async findById(id: string, ownerUserId: string): Promise<FinancialTransactionEntity | null> {
    const transaction = this.transactions.get(id);
    return transaction && transaction.ownerUserId === ownerUserId ? transaction : null;
  }

  async list(filters: FinancialTransactionFilters): Promise<FinancialTransactionEntity[]> {
    return [...this.transactions.values()]
      .filter((item) => item.ownerUserId === filters.ownerUserId)
      .filter((item) => !filters.type || item.type === filters.type)
      .filter((item) => !filters.customerId || item.customerId === filters.customerId)
      .filter((item) => !filters.freightId || item.freightId === filters.freightId)
      .filter((item) => !filters.from || item.dueDate >= filters.from)
      .filter((item) => !filters.to || item.dueDate <= filters.to)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }

  async update(
    id: string,
    transaction: FinancialTransactionEntity,
  ): Promise<FinancialTransactionEntity> {
    this.transactions.set(id, transaction);
    return transaction;
  }

  async remove(id: string): Promise<void> {
    this.transactions.delete(id);
  }
}

@Injectable()
export class InMemoryInvoicesRepository implements InvoicesRepository {
  private readonly invoices: InvoiceEntity[] = [];

  async create(invoice: InvoiceEntity): Promise<InvoiceEntity> {
    this.invoices.unshift(invoice);
    return invoice;
  }

  async list(ownerUserId: string): Promise<InvoiceEntity[]> {
    return this.invoices.filter((invoice) => invoice.ownerUserId === ownerUserId);
  }
}
