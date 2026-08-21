import { Module } from '@nestjs/common';
import { AuthModule } from '@applications/auth/auth.module';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { NfeService } from '@nf-e/application/services/nf-e.service';
import { NFE_PROVIDER } from '@nf-e/domain/providers/nfe.provider';
import { NotConfiguredNfeProvider } from '@nf-e/infrastructure/providers/not-configured-nfe.provider';
import { NfeController } from '@nf-e/presentation/controllers/nf-e.controller';

@Module({
  imports: [AuthModule],
  controllers: [NfeController],
  providers: [
    NfeService,
    JwtAuthGuard,
    RolesGuard,
    // Trocar por um provider com certificado A1/A3 quando a integração existir.
    { provide: NFE_PROVIDER, useClass: NotConfiguredNfeProvider },
  ],
  exports: [NfeService],
})
export class NfeModule {}
