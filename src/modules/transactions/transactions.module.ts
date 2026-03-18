import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  TransactionOrmEntity,
  UserOrmEntity,
  WalletOrmEntity,
} from '@database/typeorm/entities';
import { UserWalletProvisioningService } from '@database/typeorm/repositories/user-wallet-provisioning.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { TransactionsService } from '@applications/transactions/application/services/transactions.service';
import { InMemoryTransactionsRepository } from '@transactions/infrastructure/repositories/in-memory-transactions.repository';
import { PostgresTransactionsRepository } from '@transactions/infrastructure/repositories/postgres-transactions.repository';
import { TRANSACTIONS_REPOSITORY } from '@transactions/domain/repositories/transactions.repository';
import { TransactionsController } from '@transactions/presentation/controllers/transactions.controller';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    ...(isTest
      ? []
      : [TypeOrmModule.forFeature([UserOrmEntity, WalletOrmEntity, TransactionOrmEntity])]),
  ],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    JwtAuthGuard,
    RolesGuard,
    ...(isTest ? [] : [UserWalletProvisioningService]),
    {
      provide: TRANSACTIONS_REPOSITORY,
      useClass: isTest
        ? InMemoryTransactionsRepository
        : PostgresTransactionsRepository,
    },
  ],
  exports: [TransactionsService],
})
export class TransactionsModule {}





