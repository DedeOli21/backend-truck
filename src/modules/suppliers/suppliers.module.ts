import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@applications/auth/auth.module';
import { SupplierOrmEntity } from '@database/typeorm/entities/supplier.orm-entity';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { SuppliersService } from '@applications/suppliers/application/services/suppliers.service';
import { SUPPLIERS_REPOSITORY } from '@applications/suppliers/domain/repositories/suppliers.repository';
import { InMemorySuppliersRepository } from '@applications/suppliers/infrastructure/repositories/in-memory-suppliers.repository';
import { PostgresSuppliersRepository } from '@applications/suppliers/infrastructure/repositories/postgres-suppliers.repository';
import { SuppliersController } from '@applications/suppliers/presentation/controllers/suppliers.controller';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [AuthModule, ...(isTest ? [] : [TypeOrmModule.forFeature([SupplierOrmEntity])])],
  controllers: [SuppliersController],
  providers: [
    SuppliersService,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: SUPPLIERS_REPOSITORY,
      useClass: isTest ? InMemorySuppliersRepository : PostgresSuppliersRepository,
    },
  ],
  exports: [SuppliersService],
})
export class SuppliersModule {}
