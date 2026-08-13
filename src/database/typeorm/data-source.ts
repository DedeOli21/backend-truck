import 'dotenv/config';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  OpenBankingSyncOrmEntity,
  PayableOrmEntity,
  TransactionOrmEntity,
  TruckOrmEntity,
  UserOrmEntity,
  WalletOrmEntity,
  DriverOrmEntity,
  DriverReferenceContactOrmEntity,
  DriverAuditLogOrmEntity,
} from '@database/typeorm/entities';


export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER ?? 'truck_admin',
  password: process.env.DATABASE_PASSWORD ?? 'truck_password',
  database: process.env.DATABASE_NAME ?? 'truckdb',
  ssl:
    process.env.DATABASE_SSL === 'true'
      ? { rejectUnauthorized: false }
      : false,
  entities: [
    UserOrmEntity,
    TruckOrmEntity,
    WalletOrmEntity,
    TransactionOrmEntity,
    PayableOrmEntity,
    OpenBankingSyncOrmEntity,
    DriverOrmEntity,
    DriverReferenceContactOrmEntity,
    DriverAuditLogOrmEntity,
  ],
  migrations: ['src/database/typeorm/migrations/*.ts', 'dist/database/typeorm/migrations/*.js'],
  synchronize: false,
});




