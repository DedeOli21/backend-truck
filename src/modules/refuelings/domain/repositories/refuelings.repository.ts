import { RefuelingEntity } from '@refuelings/domain/entities/refueling.entity';

export const REFUELINGS_REPOSITORY = 'REFUELINGS_REPOSITORY';

export interface RefuelingFilters {
  /** Gestor dono dos registros. Obrigatório: ninguém lista fora do próprio escopo. */
  ownerUserId?: string;
  truckId?: string;
  driverId?: string;
  from?: Date;
  to?: Date;
}

export interface RefuelingsRepository {
  create(refueling: RefuelingEntity): Promise<RefuelingEntity>;
  findById(id: string, ownerUserId?: string): Promise<RefuelingEntity | null>;
  list(filters: RefuelingFilters): Promise<RefuelingEntity[]>;
  update(id: string, refueling: RefuelingEntity): Promise<RefuelingEntity>;
  remove(id: string): Promise<void>;
}
