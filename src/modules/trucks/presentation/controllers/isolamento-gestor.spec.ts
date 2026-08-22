import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { DriversService } from '@applications/drivers/application/services/drivers.service';
import { TrucksService } from '@trucks/application/services/trucks.service';
import { TRUCKS_REPOSITORY } from '@trucks/domain/repositories/trucks.repository';
import { InMemoryTrucksRepository } from '@trucks/infrastructure/repositories/in-memory-trucks.repository';
import { TrucksController } from '@trucks/presentation/controllers/trucks.controller';

const GESTOR_A = '11111111-1111-4111-8111-111111111111';
const GESTOR_B = '22222222-2222-4222-8222-222222222222';
const MOTORISTA_DE_A = '33333333-3333-4333-8333-333333333333';

// Quem está autenticado muda entre os testes; o guard só reflete essa escolha.
let autenticado = { sub: GESTOR_A, role: 'ADMIN' as 'ADMIN' | 'DRIVER' };

const veiculo = (plate: string) => ({
  plate,
  brandModel: 'Volvo FH 540',
  type: 'CARRETA',
  capacity: 30,
});

describe('Isolamento por gestor (rotas de veículos)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TrucksController],
      providers: [
        TrucksService,
        { provide: TRUCKS_REPOSITORY, useClass: InMemoryTrucksRepository },
        {
          provide: DriversService,
          useValue: {
            // O motorista do cenário pertence ao gestor A.
            escopoDoUsuario: async (userId: string, role: 'ADMIN' | 'DRIVER') =>
              role === 'ADMIN' ? userId : userId === MOTORISTA_DE_A ? GESTOR_A : null,
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

  let veiculoDeA = '';

  it('gestor A cadastra o próprio veículo', async () => {
    como(GESTOR_A);

    const { body } = await request(app.getHttpServer())
      .post('/trucks')
      .send(veiculo('AAA1A11'))
      .expect(201);

    veiculoDeA = body.id;
    expect(body.plate).toBe('AAA1A11');
  });

  it('gestor B não vê o veículo do gestor A na listagem', async () => {
    como(GESTOR_B);

    const { body } = await request(app.getHttpServer()).get('/trucks').expect(200);

    expect(body).toEqual([]);
  });

  it('gestor B não abre o veículo do gestor A nem sabendo o id', async () => {
    como(GESTOR_B);

    await request(app.getHttpServer()).get(`/trucks/${veiculoDeA}`).expect(404);
  });

  it('gestor B não edita nem remove veículo do gestor A', async () => {
    como(GESTOR_B);

    await request(app.getHttpServer())
      .patch(`/trucks/${veiculoDeA}`)
      .send({ brandModel: 'Invadido' })
      .expect(404);
    await request(app.getHttpServer()).delete(`/trucks/${veiculoDeA}`).expect(404);

    como(GESTOR_A);
    const { body } = await request(app.getHttpServer()).get(`/trucks/${veiculoDeA}`).expect(200);
    expect(body.brandModel).toBe('Volvo FH 540');
  });

  it('a mesma placa pode existir em frotas de gestores diferentes', async () => {
    como(GESTOR_B);

    await request(app.getHttpServer()).post('/trucks').send(veiculo('AAA1A11')).expect(201);
  });

  it('motorista enxerga a frota do gestor a que pertence', async () => {
    como(MOTORISTA_DE_A, 'DRIVER');

    const { body } = await request(app.getHttpServer()).get('/trucks').expect(200);

    expect(body.map((item: { id: string }) => item.id)).toContain(veiculoDeA);
  });

  it('usuário sem vínculo com gestor nenhum não enxerga frota alguma', async () => {
    como('44444444-4444-4444-8444-444444444444', 'DRIVER');

    const { body } = await request(app.getHttpServer()).get('/trucks').expect(200);

    expect(body).toEqual([]);
  });
});
