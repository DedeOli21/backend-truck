import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PayableCategoryDb, PayableStatus } from '@database/typeorm/entities/enums';
import { WalletOrmEntity } from '@database/typeorm/entities/wallet.orm-entity';
import { TransactionOrmEntity } from '@database/typeorm/entities/transaction.orm-entity';

@Entity({ name: 'payables' })
export class PayableOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId!: string;

  @ManyToOne(() => WalletOrmEntity, (wallet) => wallet.payables, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'wallet_id' })
  wallet!: WalletOrmEntity;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'enum', enum: PayableCategoryDb })
  category!: PayableCategoryDb;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount!: string;

  @Column({ name: 'due_date', type: 'date' })
  dueDate!: string;

  @Column({ type: 'enum', enum: PayableStatus, default: PayableStatus.PENDING })
  status!: PayableStatus;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'transaction_id', type: 'uuid', nullable: true, unique: true })
  transactionId!: string | null;

  @OneToOne(() => TransactionOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'transaction_id' })
  transaction!: TransactionOrmEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}




