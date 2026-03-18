import { TransactionsService } from '@app/modules/transactions/application/services/transactions.service';
import { InMemoryTransactionsRepository } from '@app/modules/transactions/infrastructure/repositories/in-memory-transactions.repository';

describe('TransactionsService', () => {
  let service: TransactionsService;

  beforeEach(() => {
    service = new TransactionsService(new InMemoryTransactionsRepository());
  });

  it('deve criar uma entrada de frete e aumentar o saldo', async () => {
    const userId = 'driver-1';

    const freight = await service.createFreight(userId, {
      amount: 1500,
      description: 'Recebimento de frete',
    });

    const balance = await service.getBalance(userId);

    expect(freight.type).toBe('FREIGHT');
    expect(freight.amount).toBe(1500);
    expect(balance).toBe(1500);
  });

  it('deve criar uma saida de combustivel e abater do saldo', async () => {
    const userId = 'driver-2';

    await service.createFreight(userId, {
      amount: 1000,
      description: 'Frete inicial',
    });

    const fuel = await service.createFuel(userId, {
      amount: 300,
      description: 'Abastecimento',
    });

    const balance = await service.getBalance(userId);

    expect(fuel.type).toBe('FUEL');
    expect(fuel.amount).toBe(300);
    expect(balance).toBe(700);
  });
});




