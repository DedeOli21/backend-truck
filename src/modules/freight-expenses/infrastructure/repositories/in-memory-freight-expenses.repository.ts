import { Injectable } from '@nestjs/common';
import { FreightExpenseEntity } from '@applications/freight-expenses/domain/entities/freight-expense.entity';
import { FreightExpensesRepository } from '@applications/freight-expenses/domain/repositories/freight-expenses.repository';

@Injectable()
export class InMemoryFreightExpensesRepository implements FreightExpensesRepository {
  private readonly expenses = new Map<string, FreightExpenseEntity>();

  async create(expense: FreightExpenseEntity): Promise<FreightExpenseEntity> {
    this.expenses.set(expense.id, expense);
    return expense;
  }

  async findById(id: string): Promise<FreightExpenseEntity | null> {
    return this.expenses.get(id) ?? null;
  }

  async listByFreight(freightId: string): Promise<FreightExpenseEntity[]> {
    return [...this.expenses.values()]
      .filter((expense) => expense.freightId === freightId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async totalsByFreight(freightIds: string[]): Promise<Map<string, number>> {
    const totals = new Map<string, number>();

    for (const expense of this.expenses.values()) {
      if (freightIds.includes(expense.freightId)) {
        totals.set(expense.freightId, (totals.get(expense.freightId) ?? 0) + expense.amount);
      }
    }

    return totals;
  }

  async remove(id: string): Promise<void> {
    this.expenses.delete(id);
  }
}
