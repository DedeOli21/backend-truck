import { RefuelingEntity } from '@refuelings/domain/entities/refueling.entity';

export const REFUELINGS_REPOSITORY = 'REFUELINGS_REPOSITORY';

export interface RefuelingFilters {
  truckId?: string;
  driverId?: string;
  from?: Date;
  to?: Date;
}

export interface RefuelingsRepository {
  create(refueling: RefuelingEntity): Promise<RefuelingEntity>;
  findById(id: string): Promise<RefuelingEntity | null>;
  list(filters: RefuelingFilters): Promise<RefuelingEntity[]>;
  update(id: string, refueling: RefuelingEntity): Promise<RefuelingEntity>;
  remove(id: string): Promise<void>;
}
