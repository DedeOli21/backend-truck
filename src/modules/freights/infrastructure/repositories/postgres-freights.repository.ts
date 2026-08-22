import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FreightOrmEntity } from '@database/typeorm/entities/freight.orm-entity';
import { FreightEntity, FreightStatus } from '@freights/domain/entities/freight.entity';
import {
  FreightFilters,
  FreightsRepository,
} from '@freights/domain/repositories/freights.repository';

@Injectable()
export class PostgresFreightsRepository implements FreightsRepository {
  constructor(
    @InjectRepository(FreightOrmEntity)
    private readonly repository: Repository<FreightOrmEntity>,
  ) {}

  private toDomain(row: FreightOrmEntity): FreightEntity {
    return new FreightEntity({ ...row, status: row.status as FreightStatus });
  }

  async save(freight: FreightEntity): Promise<FreightEntity> {
    await this.repository.save(this.repository.create({ ...freight }));
    return this.toDomain(await this.repository.findOneOrFail({ where: { id: freight.id } }));
  }

  async findById(id: string, ownerUserId?: string): Promise<FreightEntity | null> {
    const row = await this.repository.findOne({
      where: ownerUserId ? { id, ownerUserId } : { id },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByCodigo(codigo: string, ownerUserId?: string): Promise<FreightEntity | null> {
    const row = await this.repository.findOne({
      where: ownerUserId ? { codigo, ownerUserId } : { codigo },
    });
    return row ? this.toDomain(row) : null;
  }

  async list(filtros: FreightFilters): Promise<FreightEntity[]> {
    const query = this.repository.createQueryBuilder('frete');

    if (filtros.ownerUserId) {
      query.andWhere('frete.owner_user_id = :ownerUserId', { ownerUserId: filtros.ownerUserId });
    }

    if (filtros.status) query.andWhere('frete.status = :status', { status: filtros.status });
    if (filtros.truckId) query.andWhere('frete.truckId = :truckId', { truckId: filtros.truckId });
    if (filtros.driverId) {
      query.andWhere('frete.driverId = :driverId', { driverId: filtros.driverId });
    }
    if (filtros.from) query.andWhere('frete.createdAt >= :from', { from: filtros.from });
    if (filtros.to) query.andWhere('frete.createdAt <= :to', { to: filtros.to });

    const rows = await query.orderBy('frete.createdAt', 'DESC').getMany();
    return rows.map((row) => this.toDomain(row));
  }

  async remove(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
