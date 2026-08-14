import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DriverOrmEntity,
  DriverPaymentAuditLogOrmEntity,
  DriverPaymentOrmEntity,
  TruckOrmEntity,
} from '@database/typeorm/entities';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { DriverPaymentsService } from '@applications/driver-payments/application/services/driver-payments.service';
import {
  DRIVER_PAYMENT_AUDIT_LOG_REPOSITORY,
  DRIVER_PAYMENTS_REPOSITORY,
} from '@driver-payments/domain/repositories/driver-payments.repository';
import { InMemoryDriverPaymentAuditLogRepository } from '@driver-payments/infrastructure/repositories/in-memory-driver-payment-audit-log.repository';
import { InMemoryDriverPaymentsRepository } from '@driver-payments/infrastructure/repositories/in-memory-driver-payments.repository';
import { PostgresDriverPaymentAuditLogRepository } from '@driver-payments/infrastructure/repositories/postgres-driver-payment-audit-log.repository';
import { PostgresDriverPaymentsRepository } from '@driver-payments/infrastructure/repositories/postgres-driver-payments.repository';
import { DriverPaymentsController } from '@driver-payments/presentation/controllers/driver-payments.controller';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    ...(isTest
      ? []
      : [
          TypeOrmModule.forFeature([
            DriverPaymentOrmEntity,
            DriverPaymentAuditLogOrmEntity,
            DriverOrmEntity,
            TruckOrmEntity,
          ]),
        ]),
  ],
  controllers: [DriverPaymentsController],
  providers: [
    DriverPaymentsService,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: DRIVER_PAYMENTS_REPOSITORY,
      useClass: isTest ? InMemoryDriverPaymentsRepository : PostgresDriverPaymentsRepository,
    },
    {
      provide: DRIVER_PAYMENT_AUDIT_LOG_REPOSITORY,
      useClass: isTest
        ? InMemoryDriverPaymentAuditLogRepository
        : PostgresDriverPaymentAuditLogRepository,
    },
  ],
  exports: [DriverPaymentsService],
})
export class DriverPaymentsModule {}
