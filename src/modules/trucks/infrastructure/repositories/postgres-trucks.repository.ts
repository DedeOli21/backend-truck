import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TruckStatus } from '@database/typeorm/entities/enums';
import { TruckOrmEntity } from '@database/typeorm/entities/truck.orm-entity';
import { TruckEntity } from '@trucks/domain/entities/truck.entity';
import { TrucksRepository } from '@trucks/domain/repositories/trucks.repository';

@Injectable()
export class PostgresTrucksRepository implements TrucksRepository {
  constructor(
    @InjectRepository(TruckOrmEntity)
    private readonly repository: Repository<TruckOrmEntity>,
  ) {}

  private toDomain(row: TruckOrmEntity): TruckEntity {
    return new TruckEntity({
      id: row.id,
      plate: row.plate,
      rntrc: row.rntrc,
      brandModel: row.brandModel,
      year: row.year,
      type: row.type,
      capacity: Number(row.capacity),
      status: row.status,
      driverId: row.driverId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async create(truck: TruckEntity): Promise<TruckEntity> {
    const row = this.repository.create({
      id: truck.id,
      plate: truck.plate,
      rntrc: truck.rntrc,
      brandModel: truck.brandModel,
      year: truck.year,
      type: truck.type,
      capacity: truck.capacity,
      status: truck.status,
      driverId: truck.driverId,
    });

    return this.toDomain(await this.repository.save(row));
  }

  async findById(id: string): Promise<TruckEntity | null> {
    const row = await this.repository.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByPlate(plate: string): Promise<TruckEntity | null> {
    const row = await this.repository.findOne({ where: { plate } });
    return row ? this.toDomain(row) : null;
  }

  async list(status?: TruckStatus): Promise<TruckEntity[]> {
    const rows = await this.repository.find({
      where: status ? { status } : {},
      order: { plate: 'ASC' },
    });

    return rows.map((row) => this.toDomain(row));
  }

  async update(id: string, truck: TruckEntity): Promise<TruckEntity> {
    await this.repository.update(id, {
      plate: truck.plate,
      rntrc: truck.rntrc,
      brandModel: truck.brandModel,
      year: truck.year,
      type: truck.type,
      capacity: truck.capacity,
      status: truck.status,
      driverId: truck.driverId,
    });

    const row = await this.repository.findOneOrFail({ where: { id } });
    return this.toDomain(row);
  }

  async remove(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
