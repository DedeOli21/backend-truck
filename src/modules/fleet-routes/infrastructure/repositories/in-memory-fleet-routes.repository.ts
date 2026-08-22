import { Injectable } from '@nestjs/common';
import { FleetRouteEntity } from '@applications/fleet-routes/domain/entities/fleet-route.entity';
import { FleetRouteFilters, FleetRoutesRepository } from '@applications/fleet-routes/domain/repositories/fleet-routes.repository';

@Injectable()
export class InMemoryFleetRoutesRepository implements FleetRoutesRepository {
  private readonly records = new Map<string, FleetRouteEntity>();

  async create(record: FleetRouteEntity): Promise<FleetRouteEntity> {
    this.records.set(record.id, record);
    return record;
  }

  async findById(id: string, ownerUserId: string): Promise<FleetRouteEntity | null> {
    const record = this.records.get(id);
    return record && record.ownerUserId === ownerUserId ? record : null;
  }

  async list(filters: FleetRouteFilters): Promise<FleetRouteEntity[]> {
    const search = filters.search?.toLowerCase();

    return [...this.records.values()]
      .filter((record) => record.ownerUserId === filters.ownerUserId)
      .filter((record) => !search || String(record.routeName).toLowerCase().includes(search))
      .sort((a, b) => String(a.routeName).localeCompare(String(b.routeName)));
  }

  async update(id: string, record: FleetRouteEntity): Promise<FleetRouteEntity> {
    this.records.set(id, record);
    return record;
  }

  async remove(id: string): Promise<void> {
    this.records.delete(id);
  }
}
