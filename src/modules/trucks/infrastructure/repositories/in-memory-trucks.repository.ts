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

  async findById(id: string, ownerUserId?: string): Promise<TruckEntity | null> {
    const truck = this.trucks.get(id);
    return truck && (!ownerUserId || truck.ownerUserId === ownerUserId) ? truck : null;
  }

  async findByPlate(plate: string, ownerUserId?: string): Promise<TruckEntity | null> {
    return (
      [...this.trucks.values()].find(
        (truck) =>
          truck.plate === plate && (!ownerUserId || truck.ownerUserId === ownerUserId),
      ) ?? null
    );
  }

  async list(status?: TruckStatus, ownerUserId?: string): Promise<TruckEntity[]> {
    return [...this.trucks.values()]
      .filter((truck) => !status || truck.status === status)
      .filter((truck) => !ownerUserId || truck.ownerUserId === ownerUserId);
  }

  async update(id: string, truck: TruckEntity): Promise<TruckEntity> {
    this.trucks.set(id, truck);
    return truck;
  }

  async remove(id: string): Promise<void> {
    this.trucks.delete(id);
  }
}
