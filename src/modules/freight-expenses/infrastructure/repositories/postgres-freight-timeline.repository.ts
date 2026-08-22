import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FreightTimelineEventOrmEntity } from '@database/typeorm/entities/freight-timeline-event.orm-entity';
import { FreightTimelineEventEntity } from '@applications/freight-expenses/domain/entities/freight-timeline-event.entity';
import { FreightTimelineRepository } from '@applications/freight-expenses/domain/repositories/freight-timeline.repository';

@Injectable()
export class PostgresFreightTimelineRepository implements FreightTimelineRepository {
  constructor(
    @InjectRepository(FreightTimelineEventOrmEntity)
    private readonly repository: Repository<FreightTimelineEventOrmEntity>,
  ) {}

  private toDomain(row: FreightTimelineEventOrmEntity): FreightTimelineEventEntity {
    return new FreightTimelineEventEntity({
      id: row.id,
      freightId: row.freightId,
      title: row.title,
      description: row.description,
      status: row.status,
      updatedBy: row.updatedBy,
      createdAt: row.createdAt,
    });
  }

  async create(event: FreightTimelineEventEntity): Promise<FreightTimelineEventEntity> {
    const row = this.repository.create({
      id: event.id,
      freightId: event.freightId,
      title: event.title,
      description: event.description,
      status: event.status,
      updatedBy: event.updatedBy,
    });

    return this.toDomain(await this.repository.save(row));
  }

  async listByFreight(freightId: string): Promise<FreightTimelineEventEntity[]> {
    const rows = await this.repository.find({
      where: { freightId },
      order: { createdAt: 'ASC' },
    });

    return rows.map((row) => this.toDomain(row));
  }
}
