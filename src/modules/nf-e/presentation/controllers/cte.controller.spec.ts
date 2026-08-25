import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { CteDocumentsService } from '@cte-documents/application/services/cte-documents.service';
import { CTE_DOCUMENTS_REPOSITORY } from '@cte-documents/domain/repositories/cte-documents.repository';
import { InMemoryCteDocumentsRepository } from '@cte-documents/infrastructure/repositories/in-memory-cte-documents.repository';
import {
  CERTIFICADO_EMISSAO,
  EmissaoCteService,
  TRANSMISSOR_SEFAZ,
} from '@nf-e/application/services/emissao-cte.service';
import { EMISSOR_CONFIG, lerEmissorConfig } from '@nf-e/infrastructure/emissao/emissor.config';
import { InMemoryNumeracaoRepository } from '@nf-e/infrastructure/emissao/in-memory-numeracao.repository';
import { NUMERACAO_REPOSITORY } from '@nf-e/infrastructure/emissao/numeracao.repository';
import { NfeService } from '@nf-e/application/services/nf-e.service';
import { NFE_PROVIDER } from '@nf-e/domain/providers/nfe.provider';
import { NotConfiguredNfeProvider } from '@nf-e/infrastructure/providers/not-configured-nfe.provider';
import { CteController } from '@nf-e/presentation/controllers/cte.controller';
import { NfeController } from '@nf-e/presentation/controllers/nf-e.controller';
import { CustomersService } from '@applications/customers/application/services/customers.service';
import { CUSTOMERS_REPOSITORY } from '@applications/customers/domain/repositories/customers.repository';
import { InMemoryCustomersRepository } from '@applications/customers/infrastructure/repositories/in-memory-customers.repository';
import { FaturamentoCteService } from '@applications/financial/application/services/faturamento-cte.service';
import { FINANCIAL_TRANSACTIONS_REPOSITORY } from '@applications/financial/domain/repositories/financial.repository';
import { InMemoryFinancialTransactionsRepository } from '@applications/financial/infrastructure/repositories/in-memory-financial.repository';

// Chave real do DACTE de exemplo (CT-e 1147, série 1, emitente 08789863000100).
const CHAVE_CTE = '35260808789863000100570010000011471000000001';
// NF-e transportada por esse CT-e, também do DACTE.
const CHAVE_NFE = '35260855078307000105550010013284551000107765';

describe('CteController (rotas)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CteController, NfeController],
      providers: [
        FaturamentoCteService,
        CustomersService,
        { provide: CUSTOMERS_REPOSITORY, useClass: InMemoryCustomersRepository },
        {
          provide: FINANCIAL_TRANSACTIONS_REPOSITORY,
          useClass: InMemoryFinancialTransactionsRepository,
        },
        NfeService,
        EmissaoCteService,
        { provide: EMISSOR_CONFIG, useFactory: () => lerEmissorConfig({}) },
        { provide: NUMERACAO_REPOSITORY, useClass: InMemoryNumeracaoRepository },
        { provide: TRANSMISSOR_SEFAZ, useValue: { enviar: jest.fn() } },
        // Sem certificado nos testes de rota: a emissão em si tem spec própria.
        { provide: CERTIFICADO_EMISSAO, useValue: null },
        CteDocumentsService,
        { provide: NFE_PROVIDER, useClass: NotConfiguredNfeProvider },
        { provide: CTE_DOCUMENTS_REPOSITORY, useClass: InMemoryCteDocumentsRepository },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('le a chave do CT-e do DACTE real', async () => {
    const { body } = await request(app.getHttpServer()).get(`/cte/qr/${CHAVE_CTE}`).expect(200);

    expect(body.documento.tipoDocumento).toBe('CTE');
    expect(body.documento.modelo).toBe(57);
    expect(body.documento.uf).toBe('SP');
    expect(body.documento.serie).toBe(1);
    expect(body.documento.numero).toBe(1147);
    expect(body.documento.cnpjEmitente).toBe('08789863000100');
  });

  it('aceita o codigo de barras do DACTE com separadores', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/cte/validar')
      .send({ conteudo: '3526.0808.7898.6300.0100.5700.1000.0011.4710.0000.0001' })
      .expect(201);

    expect(body.valido).toBe(true);
    expect(body.documento.numero).toBe(1147);
  });

  it('aceita a URL do QR Code do CT-e', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/cte/validar')
      .send({
        conteudo: `https://dfe-portal.svrs.rs.gov.br/cte/qrCode?chCTe=${CHAVE_CTE}&tpAmb=1`,
      })
      .expect(201);

    expect(body.origem).toBe('QRCODE');
    expect(body.documento.tipoDocumento).toBe('CTE');
  });

  it('recusa chave de NF-e na rota de CT-e, apontando a rota certa', async () => {
    const { body } = await request(app.getHttpServer()).get(`/cte/qr/${CHAVE_NFE}`).expect(400);

    expect(body.message).toContain('/nf-e');
  });

  it('recusa chave de CT-e na rota de NF-e, apontando a rota certa', async () => {
    const { body } = await request(app.getHttpServer()).get(`/nf-e/qr/${CHAVE_CTE}`).expect(400);

    expect(body.message).toContain('/cte');
  });
});
