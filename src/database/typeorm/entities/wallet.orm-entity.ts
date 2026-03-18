import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserOrmEntity } from '@database/typeorm/entities/user.orm-entity';
import { TransactionOrmEntity } from '@database/typeorm/entities/transaction.orm-entity';
import { PayableOrmEntity } from '@database/typeorm/entities/payable.orm-entity';

@Entity({ name: 'wallets' })
export class WalletOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string;

  @ManyToOne(() => UserOrmEntity, (user) => user.wallets, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: UserOrmEntity;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  balance!: string;

  @Column({ name: 'last_sync', type: 'timestamptz', nullable: true })
  lastSync!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => TransactionOrmEntity, (transaction) => transaction.wallet)
  transactions!: TransactionOrmEntity[];

  @OneToMany(() => PayableOrmEntity, (payable) => payable.wallet)
  payables!: PayableOrmEntity[];
}




