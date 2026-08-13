import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '@database/typeorm/entities/enums';
import { WalletOrmEntity } from '@database/typeorm/entities/wallet.orm-entity';
import { TruckOrmEntity } from '@database/typeorm/entities/truck.orm-entity';
import { OpenBankingSyncOrmEntity } from '@database/typeorm/entities/open-banking-sync.orm-entity';

@Entity({ name: 'users' })
export class UserOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'enum', enum: UserRole })
  role!: UserRole;

  @Column({ name: 'driver_id', type: 'uuid', nullable: true })
  driverId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => WalletOrmEntity, (wallet) => wallet.user)
  wallets!: WalletOrmEntity[];

  @OneToMany(() => TruckOrmEntity, (truck) => truck.driver)
  trucks!: TruckOrmEntity[];

  @OneToMany(() => OpenBankingSyncOrmEntity, (sync) => sync.user)
  openBankingSyncs!: OpenBankingSyncOrmEntity[];
}




