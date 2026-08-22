export class FreightTimelineEventEntity {
  id!: string;
  freightId!: string;
  title!: string;
  description!: string | null;
  status!: string;
  updatedBy!: string;
  createdAt!: Date;

  constructor(props: Partial<FreightTimelineEventEntity>) {
    Object.assign(this, props);
  }
}
