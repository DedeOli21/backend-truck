import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { FreightOrmEntity } from '@database/typeorm/entities/freight.orm-entity';

/** Evento imutável: a timeline é histórico, nunca é editada. */
@Entity({ name: 'freight_timeline_events' })
export class FreightTimelineEventOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'freight_id', type: 'uuid' })
  freightId!: string;

  @ManyToOne(() => FreightOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'freight_id' })
  freight!: FreightOrmEntity;

  @Column({ type: 'varchar', length: 120 })
  title!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 20 })
  status!: string;

  @Column({ name: 'updated_by', type: 'varchar', length: 160 })
  updatedBy!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
