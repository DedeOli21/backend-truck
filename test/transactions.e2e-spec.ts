import { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { TransactionsModule } from '@app/modules/transactions/transactions.module';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { RolesGuard } from '@app/common/guards/roles.guard';

class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = { sub: 'driver-e2e', role: 'DRIVER' };
    return true;
  }
}

describe('TransactionsController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TransactionsModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(MockAuthGuard)
      .overrideGuard(RolesGuard)
      .useClass(MockAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /transactions/freight deve registrar frete', async () => {
    const response = await request(app.getHttpServer())
      .post('/transactions/freight')
      .send({ amount: 2000, description: 'Frete Sao Paulo' })
      .expect(201);

    expect(response.body.type).toBe('FREIGHT');
    expect(response.body.amount).toBe(2000);
  });

  it('POST /transactions/fuel deve registrar abastecimento', async () => {
    await request(app.getHttpServer())
      .post('/transactions/freight')
      .send({ amount: 1000, description: 'Frete base' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/transactions/fuel')
      .send({ amount: 250, description: 'Diesel' })
      .expect(201);

    expect(response.body.type).toBe('FUEL');
    expect(response.body.amount).toBe(250);
  });
});




