import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '@applications/auth/auth.module';
import { CteDocumentsModule } from '@cte-documents/cte-documents.module';
import { TrucksModule } from '@trucks/trucks.module';
import { DriversModule } from '@applications/drivers/drivers.module';
import { NfeModule } from '@nf-e/nf-e.module';
import { MdfeDocumentOrmEntity } from '@database/typeorm/entities/mdfe-document.orm-entity';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { EmissaoMdfeService } from '@mdfe-documents/application/services/emissao-mdfe.service';
import { MdfeDocumentsService } from '@mdfe-documents/application/services/mdfe-documents.service';
import { MDFE_DOCUMENTS_REPOSITORY } from '@mdfe-documents/domain/repositories/mdfe-documents.repository';
import { InMemoryMdfeDocumentsRepository } from '@mdfe-documents/infrastructure/repositories/in-memory-mdfe-documents.repository';
import { PostgresMdfeDocumentsRepository } from '@mdfe-documents/infrastructure/repositories/postgres-mdfe-documents.repository';
import { MDFE_NUMERACAO_REPOSITORY } from '@mdfe-documents/infrastructure/emissao/mdfe-numeracao.repository';
import { InMemoryMdfeNumeracaoRepository } from '@mdfe-documents/infrastructure/emissao/in-memory-mdfe-numeracao.repository';
import { PostgresMdfeNumeracaoRepository } from '@mdfe-documents/infrastructure/emissao/postgres-mdfe-numeracao.repository';
import { MdfeDocumentsController } from '@mdfe-documents/presentation/controllers/mdfe-documents.controller';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    AuthModule,
    CteDocumentsModule,
    TrucksModule,
    DriversModule,
    NfeModule,
    ...(isTest ? [] : [TypeOrmModule.forFeature([MdfeDocumentOrmEntity])]),
  ],
  controllers: [MdfeDocumentsController],
  providers: [
    EmissaoMdfeService,
    MdfeDocumentsService,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: MDFE_DOCUMENTS_REPOSITORY,
      useClass: isTest ? InMemoryMdfeDocumentsRepository : PostgresMdfeDocumentsRepository,
    },
    {
      provide: MDFE_NUMERACAO_REPOSITORY,
      useClass: isTest ? InMemoryMdfeNumeracaoRepository : PostgresMdfeNumeracaoRepository,
    },
  ],
  exports: [MdfeDocumentsService, EmissaoMdfeService],
})
export class MdfeDocumentsModule {}
