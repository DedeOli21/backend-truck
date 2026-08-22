import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FreightExpenseOrmEntity } from '@database/typeorm/entities/freight-expense.orm-entity';
import { FreightExpenseEntity } from '@applications/freight-expenses/domain/entities/freight-expense.entity';
import { FreightExpensesRepository } from '@applications/freight-expenses/domain/repositories/freight-expenses.repository';

@Injectable()
export class PostgresFreightExpensesRepository implements FreightExpensesRepository {
  constructor(
    @InjectRepository(FreightExpenseOrmEntity)
    private readonly repository: Repository<FreightExpenseOrmEntity>,
  ) {}

  private toDomain(row: FreightExpenseOrmEntity): FreightExpenseEntity {
    return new FreightExpenseEntity({
      id: row.id,
      freightId: row.freightId,
      type: row.type,
      amount: Number(row.amount),
      description: row.description,
      receiptUrl: row.receiptUrl,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async create(expense: FreightExpenseEntity): Promise<FreightExpenseEntity> {
    const row = this.repository.create({
      id: expense.id,
      freightId: expense.freightId,
      type: expense.type,
      amount: expense.amount,
      description: expense.description,
      receiptUrl: expense.receiptUrl,
    });

    return this.toDomain(await this.repository.save(row));
  }

  async findById(id: string): Promise<FreightExpenseEntity | null> {
    const row = await this.repository.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async listByFreight(freightId: string): Promise<FreightExpenseEntity[]> {
    const rows = await this.repository.find({
      where: { freightId },
      order: { createdAt: 'DESC' },
    });

    return rows.map((row) => this.toDomain(row));
  }

  async totalsByFreight(freightIds: string[]): Promise<Map<string, number>> {
    if (freightIds.length === 0) {
      return new Map();
    }

    const rows = await this.repository
      .createQueryBuilder('expense')
      .select('expense.freight_id', 'freightId')
      .addSelect('SUM(expense.amount)', 'total')
      .where({ freightId: In(freightIds) })
      .groupBy('expense.freight_id')
      .getRawMany<{ freightId: string; total: string }>();

    return new Map(rows.map((row) => [row.freightId, Number(row.total)]));
  }

  async remove(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
