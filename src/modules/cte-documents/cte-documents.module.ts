import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@applications/auth/auth.module';
import { CteDocumentOrmEntity } from '@database/typeorm/entities/cte-document.orm-entity';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { CteDocumentsService } from '@cte-documents/application/services/cte-documents.service';
import { CTE_DOCUMENTS_REPOSITORY } from '@cte-documents/domain/repositories/cte-documents.repository';
import { InMemoryCteDocumentsRepository } from '@cte-documents/infrastructure/repositories/in-memory-cte-documents.repository';
import { PostgresCteDocumentsRepository } from '@cte-documents/infrastructure/repositories/postgres-cte-documents.repository';
import { CteDocumentsController } from '@cte-documents/presentation/controllers/cte-documents.controller';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [AuthModule, ...(isTest ? [] : [TypeOrmModule.forFeature([CteDocumentOrmEntity])])],
  controllers: [CteDocumentsController],
  providers: [
    CteDocumentsService,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: CTE_DOCUMENTS_REPOSITORY,
      useClass: isTest ? InMemoryCteDocumentsRepository : PostgresCteDocumentsRepository,
    },
  ],
  exports: [CteDocumentsService],
})
export class CteDocumentsModule {}
