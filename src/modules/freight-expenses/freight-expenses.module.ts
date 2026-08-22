import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@applications/auth/auth.module';
import { FreightsModule } from '@freights/freights.module';
import { FreightExpenseOrmEntity } from '@database/typeorm/entities/freight-expense.orm-entity';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { FreightExpensesService } from '@applications/freight-expenses/application/services/freight-expenses.service';
import { FREIGHT_EXPENSES_REPOSITORY } from '@applications/freight-expenses/domain/repositories/freight-expenses.repository';
import { InMemoryFreightExpensesRepository } from '@applications/freight-expenses/infrastructure/repositories/in-memory-freight-expenses.repository';
import { PostgresFreightExpensesRepository } from '@applications/freight-expenses/infrastructure/repositories/postgres-freight-expenses.repository';
import { FreightExpensesController } from '@applications/freight-expenses/presentation/controllers/freight-expenses.controller';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    AuthModule,
    FreightsModule,
    ...(isTest
      ? []
      : [TypeOrmModule.forFeature([FreightExpenseOrmEntity])]),
  ],
  controllers: [FreightExpensesController],
  providers: [
    FreightExpensesService,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: FREIGHT_EXPENSES_REPOSITORY,
      useClass: isTest ? InMemoryFreightExpensesRepository : PostgresFreightExpensesRepository,
    },
  ],
  exports: [FreightExpensesService],
})
export class FreightExpensesModule {}
