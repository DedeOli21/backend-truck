import { Module } from '@nestjs/common';
import { AuthModule } from '@applications/auth/auth.module';
import { CteDocumentsModule } from '@cte-documents/cte-documents.module';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { NfeService } from '@nf-e/application/services/nf-e.service';
import { NFE_PROVIDER } from '@nf-e/domain/providers/nfe.provider';
import { criarNfeProvider } from '@nf-e/infrastructure/providers/nfe-provider.factory';
import { CteController } from '@nf-e/presentation/controllers/cte.controller';
import { NfeController } from '@nf-e/presentation/controllers/nf-e.controller';

@Module({
  imports: [AuthModule, CteDocumentsModule],
  controllers: [NfeController, CteController],
  providers: [
    NfeService,
    JwtAuthGuard,
    RolesGuard,
    // Usa o certificado quando NFE_CERT_PATH e NFE_CERT_PASSWORD existem;
    // caso contrário responde de forma explícita que não consultou.
    { provide: NFE_PROVIDER, useFactory: () => criarNfeProvider() },
  ],
  exports: [NfeService],
})
export class NfeModule {}
