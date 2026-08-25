import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from '@database/database.module';
import { AuthModule } from '@modules/auth/auth.module';
import { DriversModule } from '@modules/drivers/drivers.module';
import { TrucksModule } from '@trucks/trucks.module';
import { RefuelingsModule } from '@refuelings/refuelings.module';
import { VehicleExpensesModule } from '@vehicle-expenses/vehicle-expenses.module';
import { NfeModule } from '@nf-e/nf-e.module';
import { CteDocumentsModule } from '@cte-documents/cte-documents.module';
import { MdfeDocumentsModule } from '@mdfe-documents/mdfe-documents.module';
import { FreightsModule } from '@freights/freights.module';
import { FinanceModule } from '@modules/finance/finance.module';
import { PayablesModule } from '@modules/payables/payables.module';
import { DriverPaymentsModule } from '@modules/driver-payments/driver-payments.module';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { CustomersModule } from '@applications/customers/customers.module';
import { SuppliersModule } from '@applications/suppliers/suppliers.module';
import { FleetRoutesModule } from '@applications/fleet-routes/fleet-routes.module';
import { FreightExpensesModule } from '@applications/freight-expenses/freight-expenses.module';
import { FinancialModule } from '@applications/financial/financial.module';
import { HealthController } from '@common/controllers/health.controller';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    DatabaseModule,
    AuthModule,
    TransactionsModule,
    FinanceModule,
    PayablesModule,
    DriversModule,
    TrucksModule,
    RefuelingsModule,
    VehicleExpensesModule,
    NfeModule,
    CteDocumentsModule,
    MdfeDocumentsModule,
    FreightsModule,
    DriverPaymentsModule,
    CustomersModule,
    SuppliersModule,
    FleetRoutesModule,
    FreightExpensesModule,
    FinancialModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}




