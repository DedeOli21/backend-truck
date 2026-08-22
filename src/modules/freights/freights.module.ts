import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@applications/auth/auth.module';
import { CteDocumentsModule } from '@cte-documents/cte-documents.module';
import { FreightOrmEntity } from '@database/typeorm/entities/freight.orm-entity';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { FreightsService } from '@freights/application/services/freights.service';
import { FREIGHTS_REPOSITORY } from '@freights/domain/repositories/freights.repository';
import { InMemoryFreightsRepository } from '@freights/infrastructure/repositories/in-memory-freights.repository';
import { PostgresFreightsRepository } from '@freights/infrastructure/repositories/postgres-freights.repository';
import { FreightsController } from '@freights/presentation/controllers/freights.controller';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    AuthModule,
    CteDocumentsModule,
    ...(isTest ? [] : [TypeOrmModule.forFeature([FreightOrmEntity])]),
  ],
  controllers: [FreightsController],
  providers: [
    FreightsService,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: FREIGHTS_REPOSITORY,
      useClass: isTest ? InMemoryFreightsRepository : PostgresFreightsRepository,
    },
  ],
  exports: [FreightsService],
})
export class FreightsModule {}
