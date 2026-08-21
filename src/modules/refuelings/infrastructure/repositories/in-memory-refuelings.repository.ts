import { Injectable } from '@nestjs/common';
import { RefuelingEntity } from '@refuelings/domain/entities/refueling.entity';
import {
  RefuelingFilters,
  RefuelingsRepository,
} from '@refuelings/domain/repositories/refuelings.repository';

@Injectable()
export class InMemoryRefuelingsRepository implements RefuelingsRepository {
  private readonly refuelings = new Map<string, RefuelingEntity>();

  async create(refueling: RefuelingEntity): Promise<RefuelingEntity> {
    this.refuelings.set(refueling.id, refueling);
    return refueling;
  }

  async findById(id: string): Promise<RefuelingEntity | null> {
    return this.refuelings.get(id) ?? null;
  }

  async list(filters: RefuelingFilters): Promise<RefuelingEntity[]> {
    return [...this.refuelings.values()]
      .filter((item) => !filters.truckId || item.truckId === filters.truckId)
      .filter((item) => !filters.driverId || item.driverId === filters.driverId)
      .filter((item) => !filters.from || item.refueledAt >= filters.from)
      .filter((item) => !filters.to || item.refueledAt <= filters.to)
      .sort((a, b) => b.refueledAt.getTime() - a.refueledAt.getTime());
  }

  async update(id: string, refueling: RefuelingEntity): Promise<RefuelingEntity> {
    this.refuelings.set(id, refueling);
    return refueling;
  }

  async remove(id: string): Promise<void> {
    this.refuelings.delete(id);
  }
}
