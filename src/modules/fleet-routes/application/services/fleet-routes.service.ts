import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FleetRouteEntity } from '@applications/fleet-routes/domain/entities/fleet-route.entity';
import {
  FLEET_ROUTES_REPOSITORY,
  FleetRoutesRepository,
} from '@applications/fleet-routes/domain/repositories/fleet-routes.repository';
import { CreateFleetRouteDto } from '@applications/fleet-routes/presentation/dtos/create-fleet-route.dto';
import { ListFleetRoutesQuery } from '@applications/fleet-routes/presentation/dtos/list-fleet-routes.query';
import { UpdateFleetRouteDto } from '@applications/fleet-routes/presentation/dtos/update-fleet-route.dto';

export interface FleetRouteResponse {
  id: string;
  routeName: string;
  origin: string;
  destination: string;
  distanceKm: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class FleetRoutesService {
  constructor(
    @Inject(FLEET_ROUTES_REPOSITORY)
    private readonly repository: FleetRoutesRepository,
  ) {}

  private toResponse(record: FleetRouteEntity): FleetRouteResponse {
    return {
      id: record.id,
      routeName: record.routeName,
      origin: record.origin,
      destination: record.destination,
      distanceKm: record.distanceKm,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private async getOrFail(id: string, ownerUserId: string): Promise<FleetRouteEntity> {
    const record = await this.repository.findById(id, ownerUserId);

    if (!record) {
      throw new NotFoundException('Rota não encontrado.');
    }

    return record;
  }

  async create(dto: CreateFleetRouteDto, ownerUserId: string): Promise<FleetRouteResponse> {
    const now = new Date();

    const record = new FleetRouteEntity({
      id: randomUUID(),
      ownerUserId,
      routeName: dto.routeName,
      origin: dto.origin,
      destination: dto.destination,
      distanceKm: dto.distanceKm,
      createdAt: now,
      updatedAt: now,
    });

    return this.toResponse(await this.repository.create(record));
  }

  async list(query: ListFleetRoutesQuery, ownerUserId: string): Promise<FleetRouteResponse[]> {
    const records = await this.repository.list({ ownerUserId, search: query.search });
    return records.map((record) => this.toResponse(record));
  }

  async findById(id: string, ownerUserId: string): Promise<FleetRouteResponse> {
    return this.toResponse(await this.getOrFail(id, ownerUserId));
  }

  async update(id: string, dto: UpdateFleetRouteDto, ownerUserId: string): Promise<FleetRouteResponse> {
    const current = await this.getOrFail(id, ownerUserId);

    const updated = new FleetRouteEntity({
      ...current,
      routeName: dto.routeName ?? current.routeName,
      origin: dto.origin ?? current.origin,
      destination: dto.destination ?? current.destination,
      distanceKm: dto.distanceKm ?? current.distanceKm,
      updatedAt: new Date(),
    });

    return this.toResponse(await this.repository.update(id, updated));
  }

  async remove(id: string, ownerUserId: string): Promise<void> {
    await this.getOrFail(id, ownerUserId);
    await this.repository.remove(id);
  }
}
