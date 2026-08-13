import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@applications/auth/auth.module';
import {
  DriverAuditLogOrmEntity,
  DriverOrmEntity,
  DriverReferenceContactOrmEntity,
} from '@database/typeorm/entities';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { DriversService } from '@applications/drivers/application/services/drivers.service';
import {
  DRIVER_AUDIT_LOG_REPOSITORY,
} from '@drivers/domain/repositories/driver-audit-log.repository';
import { DRIVERS_REPOSITORY } from '@drivers/domain/repositories/drivers.repository';
import { InMemoryDriverAuditLogRepository } from '@drivers/infrastructure/repositories/in-memory-driver-audit-log.repository';
import { InMemoryDriversRepository } from '@drivers/infrastructure/repositories/in-memory-drivers.repository';
import { PostgresDriverAuditLogRepository } from '@drivers/infrastructure/repositories/postgres-driver-audit-log.repository';
import { PostgresDriversRepository } from '@drivers/infrastructure/repositories/postgres-drivers.repository';
import { DriversController } from '@drivers/presentation/controllers/drivers.controller';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    AuthModule,
    ...(isTest
      ? []
      : [
          TypeOrmModule.forFeature([
            DriverOrmEntity,
            DriverReferenceContactOrmEntity,
            DriverAuditLogOrmEntity,
          ]),
        ]),
  ],
  controllers: [DriversController],
  providers: [
    DriversService,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: DRIVERS_REPOSITORY,
      useClass: isTest ? InMemoryDriversRepository : PostgresDriversRepository,
    },
    {
      provide: DRIVER_AUDIT_LOG_REPOSITORY,
      useClass: isTest ? InMemoryDriverAuditLogRepository : PostgresDriverAuditLogRepository,
    },
  ],
  exports: [DriversService],
})
export class DriversModule {}
