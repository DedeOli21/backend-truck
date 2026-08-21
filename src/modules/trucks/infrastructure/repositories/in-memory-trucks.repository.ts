import { Injectable } from '@nestjs/common';
import { TruckStatus } from '@database/typeorm/entities/enums';
import { TruckEntity } from '@trucks/domain/entities/truck.entity';
import { TrucksRepository } from '@trucks/domain/repositories/trucks.repository';

@Injectable()
export class InMemoryTrucksRepository implements TrucksRepository {
  private readonly trucks = new Map<string, TruckEntity>();

  async create(truck: TruckEntity): Promise<TruckEntity> {
    this.trucks.set(truck.id, truck);
    return truck;
  }

  async findById(id: string): Promise<TruckEntity | null> {
    return this.trucks.get(id) ?? null;
  }

  async findByPlate(plate: string): Promise<TruckEntity | null> {
    return [...this.trucks.values()].find((truck) => truck.plate === plate) ?? null;
  }

  async list(status?: TruckStatus): Promise<TruckEntity[]> {
    const all = [...this.trucks.values()];
    return status ? all.filter((truck) => truck.status === status) : all;
  }

  async update(id: string, truck: TruckEntity): Promise<TruckEntity> {
    this.trucks.set(id, truck);
    return truck;
  }

  async remove(id: string): Promise<void> {
    this.trucks.delete(id);
  }
}
