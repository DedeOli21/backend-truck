import { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { FinanceModule } from '@app/modules/finance/finance.module';
import { TransactionsModule } from '@app/modules/transactions/transactions.module';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { RolesGuard } from '@app/common/guards/roles.guard';

class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = { sub: 'driver-finance-e2e', role: 'ADMIN' };
    return true;
  }
}

describe('FinanceController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TransactionsModule, FinanceModule],
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

  it('POST /finance/open-banking/sync e GET /finance/balance devem retornar saldo consolidado', async () => {
    await request(app.getHttpServer())
      .post('/transactions/freight')
      .send({ amount: 2000, description: 'Frete base financeiro' })
      .expect(201);

    const syncResponse = await request(app.getHttpServer())
      .post('/finance/open-banking/sync')
      .send({ provider: 'Banco Teste', availableBalance: 500 })
      .expect(201);

    expect(syncResponse.body.provider).toBe('Banco Teste');
    expect(syncResponse.body.syncedAvailableBalance).toBe(500);

    const balanceResponse = await request(app.getHttpServer())
      .get('/finance/balance')
      .expect(200);

    expect(balanceResponse.body.walletBalance).toBe(2000);
    expect(balanceResponse.body.openBankingBalance).toBe(500);
    expect(balanceResponse.body.totalAvailable).toBe(2500);
  });
});




