import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FleetRouteOrmEntity } from '@database/typeorm/entities/fleet-route.orm-entity';
import { FleetRouteEntity } from '@applications/fleet-routes/domain/entities/fleet-route.entity';
import { FleetRouteFilters, FleetRoutesRepository } from '@applications/fleet-routes/domain/repositories/fleet-routes.repository';

@Injectable()
export class PostgresFleetRoutesRepository implements FleetRoutesRepository {
  constructor(
    @InjectRepository(FleetRouteOrmEntity)
    private readonly repository: Repository<FleetRouteOrmEntity>,
  ) {}

  private toDomain(row: FleetRouteOrmEntity): FleetRouteEntity {
    return new FleetRouteEntity({
      id: row.id,
      ownerUserId: row.ownerUserId,
      routeName: row.routeName,
      origin: row.origin,
      destination: row.destination,
      distanceKm: Number(row.distanceKm),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toRow(record: FleetRouteEntity) {
    return {
      ownerUserId: record.ownerUserId,
      routeName: record.routeName,
      origin: record.origin,
      destination: record.destination,
      distanceKm: record.distanceKm,
    };
  }

  async create(record: FleetRouteEntity): Promise<FleetRouteEntity> {
    const row = this.repository.create({ id: record.id, ...this.toRow(record) });
    return this.toDomain(await this.repository.save(row));
  }

  async findById(id: string, ownerUserId: string): Promise<FleetRouteEntity | null> {
    const row = await this.repository.findOne({ where: { id, ownerUserId } });
    return row ? this.toDomain(row) : null;
  }

  async list(filters: FleetRouteFilters): Promise<FleetRouteEntity[]> {
    const query = this.repository
      .createQueryBuilder('route')
      .where('route.owner_user_id = :ownerUserId', { ownerUserId: filters.ownerUserId });

    if (filters.search) {
      query.andWhere('route.route_name ILIKE :search', { search: `%${filters.search}%` });
    }

    const rows = await query.orderBy('route.route_name', 'ASC').getMany();
    return rows.map((row) => this.toDomain(row));
  }

  async update(id: string, record: FleetRouteEntity): Promise<FleetRouteEntity> {
    await this.repository.update(id, this.toRow(record));
    return this.toDomain(await this.repository.findOneOrFail({ where: { id } }));
  }

  async remove(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
