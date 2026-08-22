import { FreightTimelineEventEntity } from '@applications/freight-expenses/domain/entities/freight-timeline-event.entity';

export const FREIGHT_TIMELINE_REPOSITORY = 'FREIGHT_TIMELINE_REPOSITORY';

export interface FreightTimelineRepository {
  create(event: FreightTimelineEventEntity): Promise<FreightTimelineEventEntity>;
  listByFreight(freightId: string): Promise<FreightTimelineEventEntity[]>;
}
