import { PayablesService } from '@applications/payables/application/services/payables.service';
import { InMemoryPayablesRepository } from '@payables/infrastructure/repositories/in-memory-payables.repository';

describe('PayablesService', () => {
  let service: PayablesService;

  beforeEach(() => {
    service = new PayablesService(new InMemoryPayablesRepository());
  });

  it('deve listar boletos urgentes padrao', async () => {
    const userId = 'driver-payables-1';

    const payables = await service.listUrgentPayables(userId);

    expect(payables).toHaveLength(3);
    expect(payables.every((item) => item.urgent)).toBe(true);
    expect(payables.every((item) => item.paid === false)).toBe(true);
  });

  it('deve marcar boleto como pago com transactionId', async () => {
    const userId = 'driver-payables-2';

    const initial = await service.listUrgentPayables(userId);
    const targetId = initial[0].id;

    const paid = await service.payPayable(userId, targetId);

    expect(paid.id).toBe(targetId);
    expect(paid.paid).toBe(true);
    expect(paid.transactionId).toBeTruthy();
  });
});





