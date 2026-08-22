import { Injectable } from '@nestjs/common';
import { FreightTimelineEventEntity } from '@applications/freight-expenses/domain/entities/freight-timeline-event.entity';
import { FreightTimelineRepository } from '@applications/freight-expenses/domain/repositories/freight-timeline.repository';

@Injectable()
export class InMemoryFreightTimelineRepository implements FreightTimelineRepository {
  private readonly events: FreightTimelineEventEntity[] = [];

  async create(event: FreightTimelineEventEntity): Promise<FreightTimelineEventEntity> {
    this.events.push(event);
    return event;
  }

  async listByFreight(freightId: string): Promise<FreightTimelineEventEntity[]> {
    return this.events
      .filter((event) => event.freightId === freightId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}
