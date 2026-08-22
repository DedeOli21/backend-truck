import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@applications/auth/auth.module';
import { CustomerOrmEntity } from '@database/typeorm/entities/customer.orm-entity';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { CustomersService } from '@applications/customers/application/services/customers.service';
import { CUSTOMERS_REPOSITORY } from '@applications/customers/domain/repositories/customers.repository';
import { InMemoryCustomersRepository } from '@applications/customers/infrastructure/repositories/in-memory-customers.repository';
import { PostgresCustomersRepository } from '@applications/customers/infrastructure/repositories/postgres-customers.repository';
import { CustomersController } from '@applications/customers/presentation/controllers/customers.controller';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [AuthModule, ...(isTest ? [] : [TypeOrmModule.forFeature([CustomerOrmEntity])])],
  controllers: [CustomersController],
  providers: [
    CustomersService,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: CUSTOMERS_REPOSITORY,
      useClass: isTest ? InMemoryCustomersRepository : PostgresCustomersRepository,
    },
  ],
  exports: [CustomersService],
})
export class CustomersModule {}
