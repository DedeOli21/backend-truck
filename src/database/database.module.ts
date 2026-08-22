import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpenBankingSyncOrmEntity } from '@database/typeorm/entities/open-banking-sync.orm-entity';
import { PayableOrmEntity } from '@database/typeorm/entities/payable.orm-entity';
import { TransactionOrmEntity } from '@database/typeorm/entities/transaction.orm-entity';
import { TruckOrmEntity } from '@database/typeorm/entities/truck.orm-entity';
import { RefuelingOrmEntity } from '@database/typeorm/entities/refueling.orm-entity';
import { VehicleExpenseOrmEntity } from '@database/typeorm/entities/vehicle-expense.orm-entity';
import { CteDocumentOrmEntity } from '@database/typeorm/entities/cte-document.orm-entity';
import { FinancialTransactionOrmEntity } from '@database/typeorm/entities/financial-transaction.orm-entity';
import { InvoiceOrmEntity } from '@database/typeorm/entities/invoice.orm-entity';
import { CustomerOrmEntity } from '@database/typeorm/entities/customer.orm-entity';
import { SupplierOrmEntity } from '@database/typeorm/entities/supplier.orm-entity';
import { FleetRouteOrmEntity } from '@database/typeorm/entities/fleet-route.orm-entity';
import { FreightExpenseOrmEntity } from '@database/typeorm/entities/freight-expense.orm-entity';
import { FreightTimelineEventOrmEntity } from '@database/typeorm/entities/freight-timeline-event.orm-entity';
import { FreightOrmEntity } from '@database/typeorm/entities/freight.orm-entity';
import { CteNumeracaoOrmEntity } from '@database/typeorm/entities/cte-numeracao.orm-entity';
import { UserOrmEntity } from '@database/typeorm/entities/user.orm-entity';
import { WalletOrmEntity } from '@database/typeorm/entities/wallet.orm-entity';
import { DriverOrmEntity } from '@database/typeorm/entities/driver.orm-entity';
import { DriverReferenceContactOrmEntity } from '@database/typeorm/entities/driver-reference-contact.orm-entity';
import { DriverAuditLogOrmEntity } from '@database/typeorm/entities/driver-audit-log.orm-entity';
import { DriverPaymentOrmEntity } from '@database/typeorm/entities/driver-payment.orm-entity';
import { DriverPaymentAuditLogOrmEntity } from '@database/typeorm/entities/driver-payment-audit-log.orm-entity';

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
              RefuelingOrmEntity,
              VehicleExpenseOrmEntity,
              CteDocumentOrmEntity,
              FreightOrmEntity,
              CteNumeracaoOrmEntity,
              WalletOrmEntity,
              TransactionOrmEntity,
              PayableOrmEntity,
              OpenBankingSyncOrmEntity,
              DriverOrmEntity,
              DriverReferenceContactOrmEntity,
              DriverAuditLogOrmEntity,
              DriverPaymentOrmEntity,
              DriverPaymentAuditLogOrmEntity,
              CustomerOrmEntity,
              SupplierOrmEntity,
              FleetRouteOrmEntity,
              FreightExpenseOrmEntity,
              FreightTimelineEventOrmEntity,
              FinancialTransactionOrmEntity,
              InvoiceOrmEntity,
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




