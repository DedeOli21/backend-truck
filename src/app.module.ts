import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from '@database/database.module';
import { AuthModule } from '@modules/auth/auth.module';
import { DriversModule } from '@modules/drivers/drivers.module';
import { FinanceModule } from '@modules/finance/finance.module';
import { PayablesModule } from '@modules/payables/payables.module';
import { TransactionsModule } from '@modules/transactions/transactions.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    DatabaseModule,
    AuthModule,
    TransactionsModule,
    FinanceModule,
    PayablesModule,
    DriversModule,
  ],
})
export class AppModule {}




