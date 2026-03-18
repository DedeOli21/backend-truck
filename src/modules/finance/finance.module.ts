import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  OpenBankingSyncOrmEntity,
  UserOrmEntity,
  WalletOrmEntity,
} from '@database/typeorm/entities';
import { UserWalletProvisioningService } from '@database/typeorm/repositories/user-wallet-provisioning.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { TransactionsModule } from '@transactions/transactions.module';
import { FinanceService } from '@applications/finance/application/services/finance.service';
import { FINANCE_REPOSITORY } from '@finance/domain/repositories/finance.repository';
import { InMemoryFinanceRepository } from '@finance/infrastructure/repositories/in-memory-finance.repository';
import { PostgresFinanceRepository } from '@finance/infrastructure/repositories/postgres-finance.repository';
import { FinanceController } from '@finance/presentation/controllers/finance.controller';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    TransactionsModule,
    ...(isTest
      ? []
      : [TypeOrmModule.forFeature([UserOrmEntity, WalletOrmEntity, OpenBankingSyncOrmEntity])]),
  ],
  controllers: [FinanceController],
  providers: [
    FinanceService,
    JwtAuthGuard,
    RolesGuard,
    ...(isTest ? [] : [UserWalletProvisioningService]),
    {
      provide: FINANCE_REPOSITORY,
      useClass: isTest ? InMemoryFinanceRepository : PostgresFinanceRepository,
    },
  ],
  exports: [FinanceService],
})
export class FinanceModule {}





