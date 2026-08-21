import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { NfeService } from '@nf-e/application/services/nf-e.service';
import { NFE_PROVIDER } from '@nf-e/domain/providers/nfe.provider';
import { montarChave } from '@nf-e/domain/value-objects/chave-acesso';
import { NotConfiguredNfeProvider } from '@nf-e/infrastructure/providers/not-configured-nfe.provider';
import { NfeController } from '@nf-e/presentation/controllers/nf-e.controller';

const chave = montarChave({
  cUf: 35,
  ano: 26,
  mes: 8,
  cnpj: '11222333000181',
  modelo: 55,
  serie: 1,
  numero: 1042,
  tipoEmissao: 1,
  codigoNumerico: 12345678,
});

describe('NfeController (rotas)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [NfeController],
      providers: [NfeService, { provide: NFE_PROVIDER, useClass: NotConfiguredNfeProvider }],
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

  // A rota estática precisa ser declarada antes de :uf/:numero, senão "qr" é
  // lido como UF e a chave como número da nota.
  it('GET /nf-e/qr/:chave nao e capturado pela rota :uf/:numero', async () => {
    const response = await request(app.getHttpServer()).get(`/nf-e/qr/${chave}`).expect(200);

    expect(response.body.documento.chave).toBe(chave);
    expect(response.body.documento.uf).toBe('SP');
    expect(response.body.sefaz.consultado).toBe(false);
  });

  it('GET /nf-e/:uf/:numero responde 503 sem integracao com a SEFAZ', async () => {
    await request(app.getHttpServer()).get('/nf-e/SP/1042').expect(503);
  });

  it('GET /nf-e/:uf/:numero recusa UF invalida', async () => {
    await request(app.getHttpServer()).get('/nf-e/XX/1042').expect(400);
  });

  it('POST /nf-e/validar aceita a URL do QR Code', async () => {
    const response = await request(app.getHttpServer())
      .post('/nf-e/validar')
      .send({ conteudo: `https://www.fazenda.sp.gov.br/nfce/qrcode?p=${chave}|2|1|1|ABC` })
      .expect(201);

    expect(response.body.valido).toBe(true);
    expect(response.body.origem).toBe('QRCODE');
  });

  it('POST /nf-e/validar recusa corpo vazio', async () => {
    await request(app.getHttpServer()).post('/nf-e/validar').send({}).expect(400);
  });

  it('GET /nf-e/qr/:chave recusa chave com digito verificador errado', async () => {
    const errada = chave.slice(0, 43) + ((Number(chave[43]) + 1) % 10);
    await request(app.getHttpServer()).get(`/nf-e/qr/${errada}`).expect(400);
  });
});
