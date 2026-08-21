import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@applications/auth/auth.module';
import { TruckOrmEntity } from '@database/typeorm/entities/truck.orm-entity';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { TrucksService } from '@trucks/application/services/trucks.service';
import { TRUCKS_REPOSITORY } from '@trucks/domain/repositories/trucks.repository';
import { InMemoryTrucksRepository } from '@trucks/infrastructure/repositories/in-memory-trucks.repository';
import { PostgresTrucksRepository } from '@trucks/infrastructure/repositories/postgres-trucks.repository';
import { TrucksController } from '@trucks/presentation/controllers/trucks.controller';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [AuthModule, ...(isTest ? [] : [TypeOrmModule.forFeature([TruckOrmEntity])])],
  controllers: [TrucksController],
  providers: [
    TrucksService,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: TRUCKS_REPOSITORY,
      useClass: isTest ? InMemoryTrucksRepository : PostgresTrucksRepository,
    },
  ],
  exports: [TrucksService],
})
export class TrucksModule {}
