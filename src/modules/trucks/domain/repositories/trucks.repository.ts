import { TruckStatus } from '@database/typeorm/entities/enums';
import { TruckEntity } from '@trucks/domain/entities/truck.entity';

export const TRUCKS_REPOSITORY = 'TRUCKS_REPOSITORY';

export interface TrucksRepository {
  create(truck: TruckEntity): Promise<TruckEntity>;
  findById(id: string, ownerUserId?: string): Promise<TruckEntity | null>;
  findByPlate(plate: string, ownerUserId?: string): Promise<TruckEntity | null>;
  list(status?: TruckStatus, ownerUserId?: string): Promise<TruckEntity[]>;
  update(id: string, truck: TruckEntity): Promise<TruckEntity>;
  remove(id: string): Promise<void>;
}
