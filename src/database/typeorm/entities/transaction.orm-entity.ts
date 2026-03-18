import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { TransactionCategory, TransactionDirection } from '@database/typeorm/entities/enums';
import { WalletOrmEntity } from '@database/typeorm/entities/wallet.orm-entity';
import { TruckOrmEntity } from '@database/typeorm/entities/truck.orm-entity';

@Entity({ name: 'transactions' })
export class TransactionOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId!: string;

  @ManyToOne(() => WalletOrmEntity, (wallet) => wallet.transactions, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'wallet_id' })
  wallet!: WalletOrmEntity;

  @Column({ name: 'truck_id', type: 'uuid', nullable: true })
  truckId!: string | null;

  @ManyToOne(() => TruckOrmEntity, (truck) => truck.transactions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'truck_id' })
  truck!: TruckOrmEntity | null;

  @Column({ type: 'enum', enum: TransactionDirection })
  direction!: TransactionDirection;

  @Column({ type: 'enum', enum: TransactionCategory })
  category!: TransactionCategory;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount!: string;

  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @Column({ name: 'transaction_date', type: 'timestamptz', default: () => 'now()' })
  transactionDate!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}




