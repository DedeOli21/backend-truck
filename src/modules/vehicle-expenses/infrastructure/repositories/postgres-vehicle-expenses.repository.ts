import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleExpenseOrmEntity } from '@database/typeorm/entities/vehicle-expense.orm-entity';
import { VehicleExpenseEntity } from '@vehicle-expenses/domain/entities/vehicle-expense.entity';
import {
  VehicleExpenseFilters,
  VehicleExpensesRepository,
} from '@vehicle-expenses/domain/repositories/vehicle-expenses.repository';

@Injectable()
export class PostgresVehicleExpensesRepository implements VehicleExpensesRepository {
  constructor(
    @InjectRepository(VehicleExpenseOrmEntity)
    private readonly repository: Repository<VehicleExpenseOrmEntity>,
  ) {}

  private toDomain(row: VehicleExpenseOrmEntity): VehicleExpenseEntity {
    return new VehicleExpenseEntity({
      id: row.id,
      truckId: row.truckId,
      driverId: row.driverId,
      category: row.category,
      description: row.description,
      amount: Number(row.amount),
      spentAt: row.spentAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toRow(expense: VehicleExpenseEntity) {
    return {
      truckId: expense.truckId,
      driverId: expense.driverId,
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      spentAt: expense.spentAt,
    };
  }

  async create(expense: VehicleExpenseEntity): Promise<VehicleExpenseEntity> {
    const row = this.repository.create({ id: expense.id, ...this.toRow(expense) });
    return this.toDomain(await this.repository.save(row));
  }

  async findById(id: string): Promise<VehicleExpenseEntity | null> {
    const row = await this.repository.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async list(filters: VehicleExpenseFilters): Promise<VehicleExpenseEntity[]> {
    const query = this.repository.createQueryBuilder('expense');

    if (filters.truckId) {
      query.andWhere('expense.truckId = :truckId', { truckId: filters.truckId });
    }

    if (filters.driverId) {
      query.andWhere('expense.driverId = :driverId', { driverId: filters.driverId });
    }

    if (filters.category) {
      query.andWhere('expense.category = :category', { category: filters.category });
    }

    if (filters.from) {
      query.andWhere('expense.spentAt >= :from', { from: filters.from });
    }

    if (filters.to) {
      query.andWhere('expense.spentAt <= :to', { to: filters.to });
    }

    const rows = await query.orderBy('expense.spentAt', 'DESC').getMany();
    return rows.map((row) => this.toDomain(row));
  }

  async update(id: string, expense: VehicleExpenseEntity): Promise<VehicleExpenseEntity> {
    await this.repository.update(id, this.toRow(expense));
    const row = await this.repository.findOneOrFail({ where: { id } });
    return this.toDomain(row);
  }

  async remove(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
