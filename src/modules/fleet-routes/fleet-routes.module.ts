import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@applications/auth/auth.module';
import { FleetRouteOrmEntity } from '@database/typeorm/entities/fleet-route.orm-entity';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { FleetRoutesService } from '@applications/fleet-routes/application/services/fleet-routes.service';
import { FLEET_ROUTES_REPOSITORY } from '@applications/fleet-routes/domain/repositories/fleet-routes.repository';
import { InMemoryFleetRoutesRepository } from '@applications/fleet-routes/infrastructure/repositories/in-memory-fleet-routes.repository';
import { PostgresFleetRoutesRepository } from '@applications/fleet-routes/infrastructure/repositories/postgres-fleet-routes.repository';
import { FleetRoutesController } from '@applications/fleet-routes/presentation/controllers/fleet-routes.controller';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [AuthModule, ...(isTest ? [] : [TypeOrmModule.forFeature([FleetRouteOrmEntity])])],
  controllers: [FleetRoutesController],
  providers: [
    FleetRoutesService,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: FLEET_ROUTES_REPOSITORY,
      useClass: isTest ? InMemoryFleetRoutesRepository : PostgresFleetRoutesRepository,
    },
  ],
  exports: [FleetRoutesService],
})
export class FleetRoutesModule {}
