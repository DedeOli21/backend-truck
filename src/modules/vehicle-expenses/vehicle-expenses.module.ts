import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@applications/auth/auth.module';
import { DriversModule } from '@applications/drivers/drivers.module';
import { TrucksModule } from '@trucks/trucks.module';
import { VehicleExpenseOrmEntity } from '@database/typeorm/entities/vehicle-expense.orm-entity';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { VehicleExpensesService } from '@vehicle-expenses/application/services/vehicle-expenses.service';
import { VEHICLE_EXPENSES_REPOSITORY } from '@vehicle-expenses/domain/repositories/vehicle-expenses.repository';
import { InMemoryVehicleExpensesRepository } from '@vehicle-expenses/infrastructure/repositories/in-memory-vehicle-expenses.repository';
import { PostgresVehicleExpensesRepository } from '@vehicle-expenses/infrastructure/repositories/postgres-vehicle-expenses.repository';
import { VehicleExpensesController } from '@vehicle-expenses/presentation/controllers/vehicle-expenses.controller';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    AuthModule,
    DriversModule,
    TrucksModule,
    ...(isTest ? [] : [TypeOrmModule.forFeature([VehicleExpenseOrmEntity])]),
  ],
  controllers: [VehicleExpensesController],
  providers: [
    VehicleExpensesService,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: VEHICLE_EXPENSES_REPOSITORY,
      useClass: isTest ? InMemoryVehicleExpensesRepository : PostgresVehicleExpensesRepository,
    },
  ],
  exports: [VehicleExpensesService],
})
export class VehicleExpensesModule {}
