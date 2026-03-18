import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PayableOrmEntity,
  UserOrmEntity,
  WalletOrmEntity,
} from '@database/typeorm/entities';
import { UserWalletProvisioningService } from '@database/typeorm/repositories/user-wallet-provisioning.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { PayablesService } from '@applications/payables/application/services/payables.service';
import { PAYABLES_REPOSITORY } from '@payables/domain/repositories/payables.repository';
import { InMemoryPayablesRepository } from '@payables/infrastructure/repositories/in-memory-payables.repository';
import { PostgresPayablesRepository } from '@payables/infrastructure/repositories/postgres-payables.repository';
import { PayablesController } from '@payables/presentation/controllers/payables.controller';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    ...(isTest
      ? []
      : [TypeOrmModule.forFeature([UserOrmEntity, WalletOrmEntity, PayableOrmEntity])]),
  ],
  controllers: [PayablesController],
  providers: [
    PayablesService,
    JwtAuthGuard,
    RolesGuard,
    ...(isTest ? [] : [UserWalletProvisioningService]),
    {
      provide: PAYABLES_REPOSITORY,
      useClass: isTest ? InMemoryPayablesRepository : PostgresPayablesRepository,
    },
  ],
  exports: [PayablesService],
})
export class PayablesModule {}





