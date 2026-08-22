import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@applications/auth/auth.module';
import { FreightsModule } from '@freights/freights.module';
import { FinancialTransactionOrmEntity } from '@database/typeorm/entities/financial-transaction.orm-entity';
import { InvoiceOrmEntity } from '@database/typeorm/entities/invoice.orm-entity';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { FinancialService } from '@applications/financial/application/services/financial.service';
import {
  FINANCIAL_TRANSACTIONS_REPOSITORY,
  INVOICES_REPOSITORY,
} from '@applications/financial/domain/repositories/financial.repository';
import {
  InMemoryFinancialTransactionsRepository,
  InMemoryInvoicesRepository,
} from '@applications/financial/infrastructure/repositories/in-memory-financial.repository';
import {
  PostgresFinancialTransactionsRepository,
  PostgresInvoicesRepository,
} from '@applications/financial/infrastructure/repositories/postgres-financial.repository';
import { FinancialController } from '@applications/financial/presentation/controllers/financial.controller';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    AuthModule,
    FreightsModule,
    ...(isTest
      ? []
      : [TypeOrmModule.forFeature([FinancialTransactionOrmEntity, InvoiceOrmEntity])]),
  ],
  controllers: [FinancialController],
  providers: [
    FinancialService,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: FINANCIAL_TRANSACTIONS_REPOSITORY,
      useClass: isTest
        ? InMemoryFinancialTransactionsRepository
        : PostgresFinancialTransactionsRepository,
    },
    {
      provide: INVOICES_REPOSITORY,
      useClass: isTest ? InMemoryInvoicesRepository : PostgresInvoicesRepository,
    },
  ],
  exports: [FinancialService],
})
export class FinancialModule {}
