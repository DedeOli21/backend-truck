import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FreightOrmEntity } from '@database/typeorm/entities/freight.orm-entity';
import { FreightExpenseType } from '@database/typeorm/entities/enums';

const numericTransformer = {
  to: (value: number) => value,
  from: (value: string | null) => (value === null ? 0 : Number(value)),
};

@Entity({ name: 'freight_expenses' })
export class FreightExpenseOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'freight_id', type: 'uuid' })
  freightId!: string;

  @ManyToOne(() => FreightOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'freight_id' })
  freight!: FreightOrmEntity;

  @Column({ type: 'varchar', length: 20 })
  type!: FreightExpenseType;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  amount!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @Column({ name: 'receipt_url', type: 'varchar', length: 500, nullable: true })
  receiptUrl!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
