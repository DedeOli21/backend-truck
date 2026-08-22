import { FleetRouteEntity } from '@applications/fleet-routes/domain/entities/fleet-route.entity';

export const FLEET_ROUTES_REPOSITORY = 'FLEET_ROUTES_REPOSITORY';

export interface FleetRouteFilters {
  /** Gestor dono dos registros. Obrigatório: ninguém lista fora do próprio escopo. */
  ownerUserId: string;
  /** Busca livre por nome (case-insensitive). */
  search?: string;
}

export interface FleetRoutesRepository {
  create(record: FleetRouteEntity): Promise<FleetRouteEntity>;
  findById(id: string, ownerUserId: string): Promise<FleetRouteEntity | null>;
  list(filters: FleetRouteFilters): Promise<FleetRouteEntity[]>;
  update(id: string, record: FleetRouteEntity): Promise<FleetRouteEntity>;
  remove(id: string): Promise<void>;
}
