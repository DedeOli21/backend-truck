import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpenBankingSyncOrmEntity } from '@database/typeorm/entities/open-banking-sync.orm-entity';
import { PayableOrmEntity } from '@database/typeorm/entities/payable.orm-entity';
import { TransactionOrmEntity } from '@database/typeorm/entities/transaction.orm-entity';
import { TruckOrmEntity } from '@database/typeorm/entities/truck.orm-entity';
import { UserOrmEntity } from '@database/typeorm/entities/user.orm-entity';
import { WalletOrmEntity } from '@database/typeorm/entities/wallet.orm-entity';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    ...(isTest
      ? []
      : [
          TypeOrmModule.forRoot({
            type: 'postgres',
            host: process.env.DATABASE_HOST ?? 'localhost',
            port: Number(process.env.DATABASE_PORT ?? 5432),
            username: process.env.DATABASE_USER ?? 'truck_admin',
            password: process.env.DATABASE_PASSWORD ?? 'truck_password',
            database: process.env.DATABASE_NAME ?? 'truckdb',
            entities: [
              UserOrmEntity,
              TruckOrmEntity,
              WalletOrmEntity,
              TransactionOrmEntity,
              PayableOrmEntity,
              OpenBankingSyncOrmEntity,
            ],
            synchronize: false,
            ssl:
              process.env.DATABASE_SSL === 'true'
                ? { rejectUnauthorized: false }
                : false,
          }),
        ]),
  ],
})
export class DatabaseModule {}




