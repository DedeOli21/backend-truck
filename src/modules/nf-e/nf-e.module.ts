import { Module } from '@nestjs/common';
import { AuthModule } from '@applications/auth/auth.module';
import { CteDocumentsModule } from '@cte-documents/cte-documents.module';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import {
  CERTIFICADO_EMISSAO,
  EmissaoCteService,
  TRANSMISSOR_SEFAZ,
} from '@nf-e/application/services/emissao-cte.service';
import { NfeService } from '@nf-e/application/services/nf-e.service';
import { lerCertificado } from '@nf-e/infrastructure/assinatura/certificado';
import {
  EMISSOR_CONFIG,
  lerEmissorConfig,
} from '@nf-e/infrastructure/emissao/emissor.config';
import { HttpsTransmissorSefaz } from '@nf-e/infrastructure/emissao/https-transmissor';
import { InMemoryNumeracaoRepository } from '@nf-e/infrastructure/emissao/in-memory-numeracao.repository';
import { NUMERACAO_REPOSITORY } from '@nf-e/infrastructure/emissao/numeracao.repository';
import { PostgresNumeracaoRepository } from '@nf-e/infrastructure/emissao/postgres-numeracao.repository';
import { NFE_PROVIDER } from '@nf-e/domain/providers/nfe.provider';
import { criarNfeProvider } from '@nf-e/infrastructure/providers/nfe-provider.factory';
import { CteController } from '@nf-e/presentation/controllers/cte.controller';
import { NfeController } from '@nf-e/presentation/controllers/nf-e.controller';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [AuthModule, CteDocumentsModule],
  controllers: [NfeController, CteController],
  providers: [
    NfeService,
    EmissaoCteService,
    { provide: EMISSOR_CONFIG, useFactory: () => lerEmissorConfig() },
    {
      provide: NUMERACAO_REPOSITORY,
      useClass: isTest ? InMemoryNumeracaoRepository : PostgresNumeracaoRepository,
    },
    {
      // Sem certificado, a emissão responde 503 em vez de tentar assinar.
      provide: CERTIFICADO_EMISSAO,
      useFactory: () => {
        const caminho = process.env.NFE_CERT_PATH;
        const senha = process.env.NFE_CERT_PASSWORD;

        if (!caminho || !senha) {
          return null;
        }

        try {
          return lerCertificado(caminho, senha);
        } catch {
          return null;
        }
      },
    },
    {
      provide: TRANSMISSOR_SEFAZ,
      useFactory: () =>
        new HttpsTransmissorSefaz({
          certPath: process.env.NFE_CERT_PATH ?? '',
          certPassword: process.env.NFE_CERT_PASSWORD ?? '',
          timeoutMs: Number(process.env.NFE_TIMEOUT_MS) || 30000,
        }),
    },
    JwtAuthGuard,
    RolesGuard,
    // Usa o certificado quando NFE_CERT_PATH e NFE_CERT_PASSWORD existem;
    // caso contrário responde de forma explícita que não consultou.
    { provide: NFE_PROVIDER, useFactory: () => criarNfeProvider() },
  ],
  exports: [NfeService],
})
export class NfeModule {}
