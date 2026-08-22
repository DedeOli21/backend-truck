import { PayablesService } from '@applications/payables/application/services/payables.service';
import { PayableEntity } from '@payables/domain/entities/payable.entity';
import { InMemoryPayablesRepository } from '@payables/infrastructure/repositories/in-memory-payables.repository';

const USER = 'driver-payables-1';

const boleto = (over: Partial<PayableEntity> = {}) =>
  new PayableEntity(
    over.id ?? 'payable-1',
    USER,
    'MAINTENANCE',
    'Manutenção do cavalo mecânico',
    1200,
    new Date('2026-09-10T00:00:00.000Z'),
    over.urgent ?? true,
    over.paid ?? false,
    null,
  );

describe('PayablesService', () => {
  let repository: InMemoryPayablesRepository;
  let service: PayablesService;

  beforeEach(() => {
    repository = new InMemoryPayablesRepository();
    service = new PayablesService(repository);
  });

  it('não inventa boleto para quem não tem nenhum', async () => {
    expect(await service.listUrgentPayables(USER)).toEqual([]);
  });

  it('lista apenas os boletos urgentes e ainda em aberto', async () => {
    await repository.saveMany(USER, [
      boleto({ id: 'urgente' }),
      boleto({ id: 'nao-urgente', urgent: false }),
      boleto({ id: 'ja-pago', paid: true }),
    ]);

    const payables = await service.listUrgentPayables(USER);

    expect(payables.map((item) => item.id)).toEqual(['urgente']);
  });

  it('marca o boleto como pago e guarda a transação', async () => {
    await repository.saveMany(USER, [boleto({ id: 'urgente' })]);

    const paid = await service.payPayable(USER, 'urgente');

    expect(paid.paid).toBe(true);
    expect(paid.transactionId).toBeTruthy();
  });
});
