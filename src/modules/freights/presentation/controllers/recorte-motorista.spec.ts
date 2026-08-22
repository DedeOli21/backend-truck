import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { AuthService } from '@applications/auth/application/services/auth.service';
import { CteDocumentsService } from '@cte-documents/application/services/cte-documents.service';
import { DriversService } from '@applications/drivers/application/services/drivers.service';
import { FreightsService } from '@freights/application/services/freights.service';
import { FREIGHTS_REPOSITORY } from '@freights/domain/repositories/freights.repository';
import { InMemoryFreightsRepository } from '@freights/infrastructure/repositories/in-memory-freights.repository';
import { FREIGHT_TIMELINE_REPOSITORY } from '@applications/freight-expenses/domain/repositories/freight-timeline.repository';
import { InMemoryFreightTimelineRepository } from '@applications/freight-expenses/infrastructure/repositories/in-memory-freight-timeline.repository';
import { FreightsController } from '@freights/presentation/controllers/freights.controller';

const GESTOR = '11111111-1111-4111-8111-111111111111';
const TRUCK = '22222222-2222-4222-8222-222222222222';

const MOTORISTA_UM = { userId: '33333333-3333-4333-8333-333333333333', driverId: '66666666-6666-4666-8666-666666666666' };
const MOTORISTA_DOIS = { userId: '44444444-4444-4444-8444-444444444444', driverId: '77777777-7777-4777-8777-777777777777' };

// Quem está autenticado muda entre os testes; o guard só reflete essa escolha.
let autenticado = { sub: GESTOR, role: 'ADMIN' as 'ADMIN' | 'DRIVER' };

describe('Recorte do motorista nos fretes', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [FreightsController],
      providers: [
        FreightsService,
        { provide: FREIGHTS_REPOSITORY, useClass: InMemoryFreightsRepository },
        { provide: FREIGHT_TIMELINE_REPOSITORY, useClass: InMemoryFreightTimelineRepository },
        { provide: CteDocumentsService, useValue: {} },
        { provide: AuthService, useValue: { nomeDoUsuario: async () => 'Administrador' } },
        {
          provide: DriversService,
          useValue: {
            // Os dois motoristas pertencem ao mesmo gestor.
            escopoDoUsuario: async (userId: string, role: 'ADMIN' | 'DRIVER') =>
              role === 'ADMIN' ? userId : GESTOR,
            findIdByUserId: async (userId: string) =>
              userId === MOTORISTA_UM.userId
                ? MOTORISTA_UM.driverId
                : userId === MOTORISTA_DOIS.userId
                  ? MOTORISTA_DOIS.driverId
                  : null,
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          context.switchToHttp().getRequest().user = { ...autenticado };
          return true;
        },
      })
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

  const como = (sub: string, role: 'ADMIN' | 'DRIVER' = 'ADMIN') => {
    autenticado = { sub, role };
  };

  const criarFrete = async (driverId: string, codigo: string) => {
    como(GESTOR);

    const { body } = await request(app.getHttpServer())
      .post('/freights')
      .send({
        codigo,
        origem: 'SP - ARUJÁ',
        destino: 'MG - CONTAGEM',
        valorFrete: 10000,
        driverId,
        truckId: TRUCK,
      })
      .expect(201);

    return body.id as string;
  };

  let freteDoUm = '';
  let freteDoDois = '';

  beforeAll(async () => {
    freteDoUm = await criarFrete(MOTORISTA_UM.driverId, 'FR-001');
    freteDoDois = await criarFrete(MOTORISTA_DOIS.driverId, 'FR-002');
  });

  it('gestor vê os fretes dos dois motoristas', async () => {
    como(GESTOR);

    const { body } = await request(app.getHttpServer()).get('/freights').expect(200);

    expect(body).toHaveLength(2);
  });

  it('motorista vê apenas o próprio frete', async () => {
    como(MOTORISTA_UM.userId, 'DRIVER');

    const { body } = await request(app.getHttpServer()).get('/freights').expect(200);

    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(freteDoUm);
  });

  it('motorista não escapa do recorte pedindo o driverId de outro', async () => {
    como(MOTORISTA_UM.userId, 'DRIVER');

    const { body } = await request(app.getHttpServer())
      .get(`/freights?driverId=${MOTORISTA_DOIS.driverId}`)
      .expect(200);

    expect(body.map((item: { id: string }) => item.id)).toEqual([freteDoUm]);
  });

  it('motorista não abre nem move o frete de outro', async () => {
    como(MOTORISTA_UM.userId, 'DRIVER');

    await request(app.getHttpServer()).get(`/freights/${freteDoDois}`).expect(403);
    await request(app.getHttpServer())
      .patch(`/freights/${freteDoDois}/status`)
      .send({ status: 'EM_TRANSITO' })
      .expect(403);
  });

  it('motorista move o próprio frete', async () => {
    como(MOTORISTA_UM.userId, 'DRIVER');

    const { body } = await request(app.getHttpServer())
      .patch(`/freights/${freteDoUm}/status`)
      .send({ status: 'EM_TRANSITO' })
      .expect(200);

    expect(body.status).toBe('EM_TRANSITO');
  });

  it('a resposta não expõe o dono do frete', async () => {
    como(GESTOR);

    const { body: lista } = await request(app.getHttpServer()).get('/freights').expect(200);
    const { body: detalhe } = await request(app.getHttpServer())
      .get(`/freights/${freteDoUm}`)
      .expect(200);

    // ownerUserId é recorte interno: vazá-lo entrega o id de outro gestor.
    expect(lista.every((frete: Record<string, unknown>) => !('ownerUserId' in frete))).toBe(true);
    expect(detalhe).not.toHaveProperty('ownerUserId');
  });

  it('usuário sem vínculo com motorista nenhum não vê frete algum', async () => {
    como('55555555-5555-4555-8555-555555555555', 'DRIVER');

    const { body } = await request(app.getHttpServer()).get('/freights').expect(200);

    expect(body).toEqual([]);
  });
});
