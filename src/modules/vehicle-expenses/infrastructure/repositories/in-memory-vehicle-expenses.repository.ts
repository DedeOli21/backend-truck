import { Injectable } from '@nestjs/common';
import { VehicleExpenseEntity } from '@vehicle-expenses/domain/entities/vehicle-expense.entity';
import {
  VehicleExpenseFilters,
  VehicleExpensesRepository,
} from '@vehicle-expenses/domain/repositories/vehicle-expenses.repository';

@Injectable()
export class InMemoryVehicleExpensesRepository implements VehicleExpensesRepository {
  private readonly expenses = new Map<string, VehicleExpenseEntity>();

  async create(expense: VehicleExpenseEntity): Promise<VehicleExpenseEntity> {
    this.expenses.set(expense.id, expense);
    return expense;
  }

  async findById(id: string): Promise<VehicleExpenseEntity | null> {
    return this.expenses.get(id) ?? null;
  }

  async list(filters: VehicleExpenseFilters): Promise<VehicleExpenseEntity[]> {
    return [...this.expenses.values()]
      .filter((item) => !filters.truckId || item.truckId === filters.truckId)
      .filter((item) => !filters.driverId || item.driverId === filters.driverId)
      .filter((item) => !filters.category || item.category === filters.category)
      .filter((item) => !filters.from || item.spentAt >= filters.from)
      .filter((item) => !filters.to || item.spentAt <= filters.to)
      .sort((a, b) => b.spentAt.getTime() - a.spentAt.getTime());
  }

  async update(id: string, expense: VehicleExpenseEntity): Promise<VehicleExpenseEntity> {
    this.expenses.set(id, expense);
    return expense;
  }

  async remove(id: string): Promise<void> {
    this.expenses.delete(id);
  }
}
