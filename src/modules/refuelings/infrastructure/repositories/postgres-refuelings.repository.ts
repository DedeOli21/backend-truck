import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefuelingOrmEntity } from '@database/typeorm/entities/refueling.orm-entity';
import { RefuelingEntity } from '@refuelings/domain/entities/refueling.entity';
import {
  RefuelingFilters,
  RefuelingsRepository,
} from '@refuelings/domain/repositories/refuelings.repository';

@Injectable()
export class PostgresRefuelingsRepository implements RefuelingsRepository {
  constructor(
    @InjectRepository(RefuelingOrmEntity)
    private readonly repository: Repository<RefuelingOrmEntity>,
  ) {}

  private toDomain(row: RefuelingOrmEntity): RefuelingEntity {
    return new RefuelingEntity({
      id: row.id,
      truckId: row.truckId,
      driverId: row.driverId,
      liters: Number(row.liters),
      pricePerLiter: Number(row.pricePerLiter),
      totalAmount: Number(row.totalAmount),
      odometer: row.odometer,
      gasStationName: row.gasStationName,
      refueledAt: row.refueledAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toRow(refueling: RefuelingEntity) {
    return {
      truckId: refueling.truckId,
      driverId: refueling.driverId,
      liters: refueling.liters,
      pricePerLiter: refueling.pricePerLiter,
      totalAmount: refueling.totalAmount,
      odometer: refueling.odometer,
      gasStationName: refueling.gasStationName,
      refueledAt: refueling.refueledAt,
    };
  }

  async create(refueling: RefuelingEntity): Promise<RefuelingEntity> {
    const row = this.repository.create({ id: refueling.id, ...this.toRow(refueling) });
    return this.toDomain(await this.repository.save(row));
  }

  async findById(id: string): Promise<RefuelingEntity | null> {
    const row = await this.repository.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async list(filters: RefuelingFilters): Promise<RefuelingEntity[]> {
    const query = this.repository.createQueryBuilder('refueling');

    if (filters.truckId) {
      query.andWhere('refueling.truckId = :truckId', { truckId: filters.truckId });
    }

    if (filters.driverId) {
      query.andWhere('refueling.driverId = :driverId', { driverId: filters.driverId });
    }

    if (filters.from) {
      query.andWhere('refueling.refueledAt >= :from', { from: filters.from });
    }

    if (filters.to) {
      query.andWhere('refueling.refueledAt <= :to', { to: filters.to });
    }

    const rows = await query.orderBy('refueling.refueledAt', 'DESC').getMany();
    return rows.map((row) => this.toDomain(row));
  }

  async update(id: string, refueling: RefuelingEntity): Promise<RefuelingEntity> {
    await this.repository.update(id, this.toRow(refueling));
    const row = await this.repository.findOneOrFail({ where: { id } });
    return this.toDomain(row);
  }

  async remove(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
