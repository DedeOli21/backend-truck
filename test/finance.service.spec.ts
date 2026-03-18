import { TransactionsService } from '@app/modules/transactions/application/services/transactions.service';
import { InMemoryTransactionsRepository } from '@app/modules/transactions/infrastructure/repositories/in-memory-transactions.repository';
import { FinanceService } from '@app/modules/finance/application/services/finance.service';
import { InMemoryFinanceRepository } from '@app/modules/finance/infrastructure/repositories/in-memory-finance.repository';

describe('FinanceService', () => {
  let financeService: FinanceService;
  let transactionsService: TransactionsService;

  beforeEach(() => {
    transactionsService = new TransactionsService(new InMemoryTransactionsRepository());
    financeService = new FinanceService(
      new InMemoryFinanceRepository(),
      transactionsService,
    );
  });

  it('deve retornar saldo total com base no saldo de movimentacoes quando nao houver sincronizacao open banking', async () => {
    const userId = 'driver-finance-1';

    await transactionsService.createFreight(userId, {
      amount: 1500,
      description: 'Frete Campinas',
    });

    await transactionsService.createFuel(userId, {
      amount: 300,
      description: 'Diesel viagem',
    });

    const balance = await financeService.getBalance(userId);

    expect(balance.walletBalance).toBe(1200);
    expect(balance.openBankingBalance).toBe(0);
    expect(balance.totalAvailable).toBe(1200);
  });

  it('deve sincronizar saldo open banking e compor saldo total disponivel', async () => {
    const userId = 'driver-finance-2';

    await transactionsService.createFreight(userId, {
      amount: 1000,
      description: 'Frete Santos',
    });

    const sync = await financeService.syncOpenBanking(userId, {
      provider: 'Banco Parceiro',
      availableBalance: 700,
    });

    const balance = await financeService.getBalance(userId);

    expect(sync.provider).toBe('Banco Parceiro');
    expect(sync.syncedAvailableBalance).toBe(700);
    expect(balance.walletBalance).toBe(1000);
    expect(balance.openBankingBalance).toBe(700);
    expect(balance.totalAvailable).toBe(1700);
  });
});




