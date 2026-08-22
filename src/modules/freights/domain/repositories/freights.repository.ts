import { FreightEntity, FreightStatus } from '@freights/domain/entities/freight.entity';

export const FREIGHTS_REPOSITORY = 'FREIGHTS_REPOSITORY';

export interface FreightFilters {
  status?: FreightStatus;
  truckId?: string;
  driverId?: string;
  from?: Date;
  to?: Date;
}

export interface FreightsRepository {
  save(freight: FreightEntity): Promise<FreightEntity>;
  findById(id: string): Promise<FreightEntity | null>;
  findByCodigo(codigo: string): Promise<FreightEntity | null>;
  list(filtros: FreightFilters): Promise<FreightEntity[]>;
  remove(id: string): Promise<void>;
}
