import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@applications/auth/auth.module';
import { DriversModule } from '@applications/drivers/drivers.module';
import { TrucksModule } from '@trucks/trucks.module';
import { RefuelingOrmEntity } from '@database/typeorm/entities/refueling.orm-entity';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { RefuelingsService } from '@refuelings/application/services/refuelings.service';
import { REFUELINGS_REPOSITORY } from '@refuelings/domain/repositories/refuelings.repository';
import { InMemoryRefuelingsRepository } from '@refuelings/infrastructure/repositories/in-memory-refuelings.repository';
import { PostgresRefuelingsRepository } from '@refuelings/infrastructure/repositories/postgres-refuelings.repository';
import { RefuelingsController } from '@refuelings/presentation/controllers/refuelings.controller';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    AuthModule,
    DriversModule,
    TrucksModule,
    ...(isTest ? [] : [TypeOrmModule.forFeature([RefuelingOrmEntity])]),
  ],
  controllers: [RefuelingsController],
  providers: [
    RefuelingsService,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: REFUELINGS_REPOSITORY,
      useClass: isTest ? InMemoryRefuelingsRepository : PostgresRefuelingsRepository,
    },
  ],
  exports: [RefuelingsService],
})
export class RefuelingsModule {}
