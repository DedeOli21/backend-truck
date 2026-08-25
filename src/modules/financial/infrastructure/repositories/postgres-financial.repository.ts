import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialTransactionOrmEntity } from '@database/typeorm/entities/financial-transaction.orm-entity';
import { InvoiceOrmEntity } from '@database/typeorm/entities/invoice.orm-entity';
import { FinancialTransactionEntity } from '@applications/financial/domain/entities/financial-transaction.entity';
import { InvoiceEntity } from '@applications/financial/domain/entities/invoice.entity';
import {
  FinancialTransactionFilters,
  FinancialTransactionsRepository,
  InvoicesRepository,
} from '@applications/financial/domain/repositories/financial.repository';

@Injectable()
export class PostgresFinancialTransactionsRepository implements FinancialTransactionsRepository {
  constructor(
    @InjectRepository(FinancialTransactionOrmEntity)
    private readonly repository: Repository<FinancialTransactionOrmEntity>,
  ) {}

  private toDomain(row: FinancialTransactionOrmEntity): FinancialTransactionEntity {
    return new FinancialTransactionEntity({
      id: row.id,
      ownerUserId: row.ownerUserId,
      type: row.type,
      category: row.category,
      description: row.description,
      amount: Number(row.amount),
      dueDate: row.dueDate,
      paidAt: row.paidAt,
      bankAccount: row.bankAccount,
      customerId: row.customerId,
      supplierId: row.supplierId,
      freightId: row.freightId,
      cteChave: row.cteChave,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toRow(transaction: FinancialTransactionEntity) {
    return {
      ownerUserId: transaction.ownerUserId,
      type: transaction.type,
      category: transaction.category,
      description: transaction.description,
      amount: transaction.amount,
      dueDate: transaction.dueDate,
      paidAt: transaction.paidAt,
      bankAccount: transaction.bankAccount,
      customerId: transaction.customerId,
      supplierId: transaction.supplierId,
      freightId: transaction.freightId,
      cteChave: transaction.cteChave,
    };
  }

  async create(transaction: FinancialTransactionEntity): Promise<FinancialTransactionEntity> {
    const row = this.repository.create({ id: transaction.id, ...this.toRow(transaction) });
    return this.toDomain(await this.repository.save(row));
  }

  async findById(id: string, ownerUserId: string): Promise<FinancialTransactionEntity | null> {
    const row = await this.repository.findOne({ where: { id, ownerUserId } });
    return row ? this.toDomain(row) : null;
  }

  async findByCteChave(
    cteChave: string,
    ownerUserId: string,
  ): Promise<FinancialTransactionEntity | null> {
    const row = await this.repository.findOne({ where: { cteChave, ownerUserId } });
    return row ? this.toDomain(row) : null;
  }

  async list(filters: FinancialTransactionFilters): Promise<FinancialTransactionEntity[]> {
    const query = this.repository
      .createQueryBuilder('transaction')
      .where('transaction.owner_user_id = :ownerUserId', { ownerUserId: filters.ownerUserId });

    if (filters.type) {
      query.andWhere('transaction.type = :type', { type: filters.type });
    }

    if (filters.customerId) {
      query.andWhere('transaction.customer_id = :customerId', { customerId: filters.customerId });
    }

    if (filters.freightId) {
      query.andWhere('transaction.freight_id = :freightId', { freightId: filters.freightId });
    }

    if (filters.somenteCte) {
      query.andWhere('transaction.cte_chave IS NOT NULL');
    }

    if (filters.from) {
      query.andWhere('transaction.due_date >= :from', { from: filters.from });
    }

    if (filters.to) {
      query.andWhere('transaction.due_date <= :to', { to: filters.to });
    }

    const rows = await query.orderBy('transaction.due_date', 'ASC').getMany();
    return rows.map((row) => this.toDomain(row));
  }

  async update(
    id: string,
    transaction: FinancialTransactionEntity,
  ): Promise<FinancialTransactionEntity> {
    await this.repository.update(id, this.toRow(transaction));
    return this.toDomain(await this.repository.findOneOrFail({ where: { id } }));
  }

  async remove(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}

@Injectable()
export class PostgresInvoicesRepository implements InvoicesRepository {
  constructor(
    @InjectRepository(InvoiceOrmEntity)
    private readonly repository: Repository<InvoiceOrmEntity>,
  ) {}

  private toDomain(row: InvoiceOrmEntity): InvoiceEntity {
    return new InvoiceEntity({
      id: row.id,
      ownerUserId: row.ownerUserId,
      customerId: row.customerId,
      freightIds: row.freightIds ? row.freightIds.split(',') : [],
      totalAmount: Number(row.totalAmount),
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async create(invoice: InvoiceEntity): Promise<InvoiceEntity> {
    const row = this.repository.create({
      id: invoice.id,
      ownerUserId: invoice.ownerUserId,
      customerId: invoice.customerId,
      freightIds: invoice.freightIds.join(','),
      totalAmount: invoice.totalAmount,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      status: invoice.status,
    });

    return this.toDomain(await this.repository.save(row));
  }

  async list(ownerUserId: string): Promise<InvoiceEntity[]> {
    const rows = await this.repository.find({
      where: { ownerUserId },
      order: { createdAt: 'DESC' },
    });

    return rows.map((row) => this.toDomain(row));
  }
}
