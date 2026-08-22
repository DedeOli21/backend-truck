import { NotFoundException } from '@nestjs/common';
import { FinancialTransactionType } from '@database/typeorm/entities/enums';
import { FreightEntity } from '@freights/domain/entities/freight.entity';
import { FreightsService } from '@freights/application/services/freights.service';
import { FinancialService } from '@applications/financial/application/services/financial.service';
import {
  InMemoryFinancialTransactionsRepository,
  InMemoryInvoicesRepository,
} from '@applications/financial/infrastructure/repositories/in-memory-financial.repository';

const GESTOR_A = '11111111-1111-4111-8111-111111111111';
const GESTOR_B = '22222222-2222-4222-8222-222222222222';
const CLIENTE = '33333333-3333-4333-8333-333333333333';

const hoje = () => new Date().toISOString().slice(0, 10);

const emDias = (dias: number) => {
  const data = new Date(`${hoje()}T00:00:00.000Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
};

describe('FinancialService', () => {
  let transactions: InMemoryFinancialTransactionsRepository;
  let invoices: InMemoryInvoicesRepository;
  let freights: { listar: jest.Mock };
  let service: FinancialService;

  beforeEach(() => {
    transactions = new InMemoryFinancialTransactionsRepository();
    invoices = new InMemoryInvoicesRepository();
    freights = { listar: jest.fn(async () => []) };
    service = new FinancialService(
      transactions,
      invoices,
      freights as unknown as FreightsService,
    );
  });

  const lancar = (
    type: FinancialTransactionType,
    amount: number,
    category = 'FRETE',
    dueDate = hoje(),
    owner = GESTOR_A,
  ) =>
    service.create({ type, category, description: 'Lançamento', amount, dueDate }, owner);

  it('separa contas a pagar de contas a receber', async () => {
    await lancar(FinancialTransactionType.RECEITA, 10000);
    await lancar(FinancialTransactionType.DESPESA, 2500, 'COMBUSTIVEL');

    const receber = await service.list({ account: 'RECEBER' }, GESTOR_A);
    const pagar = await service.list({ account: 'PAGAR' }, GESTOR_A);

    expect(receber).toHaveLength(1);
    expect(receber[0].amount).toBe(10000);
    expect(pagar).toHaveLength(1);
    expect(pagar[0].category).toBe('COMBUSTIVEL');
  });

  it('não mostra lançamento de outro gestor', async () => {
    await lancar(FinancialTransactionType.RECEITA, 10000);

    expect(await service.list({}, GESTOR_B)).toEqual([]);
  });

  it('marca como ATRASADO o que venceu sem baixa, e PAGO depois da baixa', async () => {
    const vencido = await lancar(
      FinancialTransactionType.DESPESA,
      500,
      'PEDAGIO',
      emDias(-3),
    );

    expect(vencido.status).toBe('ATRASADO');

    const baixado = await service.settle(
      vencido.id,
      { paidAt: hoje(), bankAccount: 'Itaú - 12345-6' },
      GESTOR_A,
    );

    expect(baixado.status).toBe('PAGO');
    expect(baixado.bankAccount).toBe('Itaú - 12345-6');
  });

  it('não deixa outro gestor dar baixa nem remover', async () => {
    const lancamento = await lancar(FinancialTransactionType.DESPESA, 500);

    await expect(
      service.settle(lancamento.id, { paidAt: hoje() }, GESTOR_B),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove(lancamento.id, GESTOR_B)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('classifica o DRE por categoria', async () => {
    await lancar(FinancialTransactionType.RECEITA, 10000);
    await lancar(FinancialTransactionType.DESPESA, 1000, 'IMPOSTO');
    await lancar(FinancialTransactionType.DESPESA, 3000, 'COMBUSTIVEL');
    await lancar(FinancialTransactionType.DESPESA, 500, 'ESCRITORIO');

    expect(await service.incomeStatement(GESTOR_A, {})).toEqual({
      grossRevenue: 10000,
      deductions: 1000,
      netRevenue: 9000,
      operatingCosts: 3000,
      grossProfit: 6000,
      administrativeExpenses: 500,
      netProfit: 5500,
    });
  });

  it('projeta o fluxo de caixa acumulando o saldo dia a dia', async () => {
    await lancar(FinancialTransactionType.RECEITA, 1000, 'FRETE', hoje());
    await lancar(FinancialTransactionType.DESPESA, 400, 'COMBUSTIVEL', emDias(1));

    const fluxo = await service.cashFlow(GESTOR_A);

    expect(fluxo).toHaveLength(30);
    expect(fluxo[0]).toMatchObject({ inflow: 1000, outflow: 0, projectedBalance: 1000 });
    expect(fluxo[1]).toMatchObject({ inflow: 0, outflow: 400, projectedBalance: 600 });
    expect(fluxo[2].projectedBalance).toBe(600);
  });

  it('consolida na fatura os fretes concluídos do período', async () => {
    freights.listar.mockResolvedValueOnce([
      new FreightEntity({ id: 'frete-1', valorFrete: 4000, clienteNome: 'COSAN' }),
      new FreightEntity({ id: 'frete-2', valorFrete: 6000, clienteNome: 'COSAN' }),
    ]);

    const fatura = await service.generateInvoice(
      { customerId: CLIENTE, periodStart: '2026-08-01', periodEnd: '2026-08-31' },
      GESTOR_A,
    );

    expect(fatura.totalAmount).toBe(10000);
    expect(fatura.freightIds).toEqual(['frete-1', 'frete-2']);
    expect(await service.listInvoices(GESTOR_A)).toHaveLength(1);
    expect(await service.listInvoices(GESTOR_B)).toEqual([]);
  });

  it('recusa faturar período sem frete concluído', async () => {
    await expect(
      service.generateInvoice(
        { customerId: CLIENTE, periodStart: '2026-08-01', periodEnd: '2026-08-31' },
        GESTOR_A,
      ),
    ).rejects.toThrow('Nenhum frete concluído neste período para faturar.');
  });
});
