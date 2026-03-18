import { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { RolesGuard } from '@app/common/guards/roles.guard';
import { PayablesModule } from '@app/modules/payables/payables.module';

class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = { sub: 'driver-payables-e2e', role: 'DRIVER' };
    return true;
  }
}

describe('PayablesController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PayablesModule],
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

  it('GET /payables e PATCH /payables/:id/pay devem funcionar', async () => {
    const listResponse = await request(app.getHttpServer())
      .get('/payables')
      .expect(200);

    expect(listResponse.body.length).toBeGreaterThan(0);
    const payableId = listResponse.body[0].id;

    const payResponse = await request(app.getHttpServer())
      .patch(`/payables/${payableId}/pay`)
      .expect(200);

    expect(payResponse.body.id).toBe(payableId);
    expect(payResponse.body.paid).toBe(true);
    expect(payResponse.body.transactionId).toBeTruthy();

    const listAfterPay = await request(app.getHttpServer())
      .get('/payables')
      .expect(200);

    expect(listAfterPay.body.find((item: { id: string }) => item.id === payableId)).toBeUndefined();
  });
});




