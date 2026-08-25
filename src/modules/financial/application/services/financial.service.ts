import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  FinancialTransactionType,
  InvoiceStatus,
} from '@database/typeorm/entities/enums';
import { FreightsService } from '@freights/application/services/freights.service';
import { FinancialTransactionEntity } from '@applications/financial/domain/entities/financial-transaction.entity';
import { InvoiceEntity } from '@applications/financial/domain/entities/invoice.entity';
import {
  FINANCIAL_TRANSACTIONS_REPOSITORY,
  FinancialTransactionsRepository,
  INVOICES_REPOSITORY,
  InvoicesRepository,
} from '@applications/financial/domain/repositories/financial.repository';
import { CreateFinancialTransactionDto } from '@applications/financial/presentation/dtos/create-financial-transaction.dto';
import { GenerateInvoiceDto } from '@applications/financial/presentation/dtos/generate-invoice.dto';
import { ListFinancialTransactionsQuery } from '@applications/financial/presentation/dtos/list-financial-transactions.query';
import { SettleFinancialTransactionDto } from '@applications/financial/presentation/dtos/settle-financial-transaction.dto';

export type FinancialTransactionStatus = 'PENDENTE' | 'PAGO' | 'ATRASADO';

export interface FinancialTransactionResponse {
  id: string;
  type: FinancialTransactionType;
  category: string;
  description: string;
  amount: number;
  dueDate: string;
  paidAt: string | null;
  status: FinancialTransactionStatus;
  bankAccount: string | null;
  customerId: string | null;
  supplierId: string | null;
  freightId: string | null;
  /** Chave do CT-e que originou o lançamento, quando veio do faturamento automático. */
  cteChave: string | null;
}

export interface CashFlowDay {
  date: string;
  inflow: number;
  outflow: number;
  projectedBalance: number;
}

export interface IncomeStatement {
  grossRevenue: number;
  deductions: number;
  netRevenue: number;
  operatingCosts: number;
  grossProfit: number;
  administrativeExpenses: number;
  netProfit: number;
}

export interface InvoiceResponse {
  id: string;
  customerId: string;
  freightIds: string[];
  totalAmount: number;
  periodStart: string;
  periodEnd: string;
  status: InvoiceStatus;
  createdAt: string;
}

/** Custo que anda com a operação; o resto entra como despesa administrativa. */
const CATEGORIAS_OPERACIONAIS = new Set([
  'COMBUSTIVEL',
  'PEDAGIO',
  'MANUTENCAO',
  'MOTORISTA',
  'DIARIA',
  'COMISSAO',
]);

/** Tributos e devoluções saem da receita bruta antes da receita líquida. */
const CATEGORIAS_DEDUCAO = new Set(['IMPOSTO', 'DEDUCAO', 'DEVOLUCAO']);

const hoje = () => new Date().toISOString().slice(0, 10);

const somarDias = (isoDate: string, dias: number): string => {
  const data = new Date(`${isoDate}T00:00:00.000Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
};

@Injectable()
export class FinancialService {
  constructor(
    @Inject(FINANCIAL_TRANSACTIONS_REPOSITORY)
    private readonly transactions: FinancialTransactionsRepository,
    @Inject(INVOICES_REPOSITORY) private readonly invoices: InvoicesRepository,
    @Inject(FreightsService) private readonly freightsService: FreightsService,
  ) {}

  /** Vencido e sem baixa é atraso; a coluna não guarda isso para não envelhecer no banco. */
  private statusDe(transaction: FinancialTransactionEntity): FinancialTransactionStatus {
    if (transaction.paidAt) {
      return 'PAGO';
    }

    return transaction.dueDate < hoje() ? 'ATRASADO' : 'PENDENTE';
  }

  private toResponse(transaction: FinancialTransactionEntity): FinancialTransactionResponse {
    return {
      id: transaction.id,
      type: transaction.type,
      category: transaction.category,
      description: transaction.description,
      amount: Number(transaction.amount),
      dueDate: transaction.dueDate,
      paidAt: transaction.paidAt,
      status: this.statusDe(transaction),
      bankAccount: transaction.bankAccount,
      customerId: transaction.customerId,
      supplierId: transaction.supplierId,
      freightId: transaction.freightId,
      cteChave: transaction.cteChave ?? null,
    };
  }

  private toInvoiceResponse(invoice: InvoiceEntity): InvoiceResponse {
    return {
      id: invoice.id,
      customerId: invoice.customerId,
      freightIds: invoice.freightIds,
      totalAmount: Number(invoice.totalAmount),
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      status: invoice.status,
      createdAt: invoice.createdAt.toISOString(),
    };
  }

  async create(
    dto: CreateFinancialTransactionDto,
    ownerUserId: string,
  ): Promise<FinancialTransactionResponse> {
    const now = new Date();

    const transaction = new FinancialTransactionEntity({
      id: randomUUID(),
      ownerUserId,
      type: dto.type,
      category: dto.category.trim().toUpperCase(),
      description: dto.description.trim(),
      amount: dto.amount,
      dueDate: dto.dueDate,
      paidAt: null,
      bankAccount: null,
      customerId: dto.customerId ?? null,
      supplierId: dto.supplierId ?? null,
      freightId: dto.freightId ?? null,
      cteChave: null,
      createdAt: now,
      updatedAt: now,
    });

    return this.toResponse(await this.transactions.create(transaction));
  }

  async list(
    query: ListFinancialTransactionsQuery,
    ownerUserId: string,
  ): Promise<FinancialTransactionResponse[]> {
    // "A pagar" e "a receber" são as duas faces do mesmo lançamento.
    const type =
      query.account === 'PAGAR'
        ? FinancialTransactionType.DESPESA
        : query.account === 'RECEBER'
          ? FinancialTransactionType.RECEITA
          : undefined;

    const rows = await this.transactions.list({
      ownerUserId,
      type,
      customerId: query.customerId,
      freightId: query.freightId,
      from: query.from,
      to: query.to,
    });

    return rows.map((row) => this.toResponse(row));
  }

  async settle(
    id: string,
    dto: SettleFinancialTransactionDto,
    ownerUserId: string,
  ): Promise<FinancialTransactionResponse> {
    const current = await this.transactions.findById(id, ownerUserId);

    if (!current) {
      throw new NotFoundException('Lançamento não encontrado.');
    }

    const updated = new FinancialTransactionEntity({
      ...current,
      paidAt: dto.paidAt,
      bankAccount: dto.bankAccount ?? current.bankAccount,
      updatedAt: new Date(),
    });

    return this.toResponse(await this.transactions.update(id, updated));
  }

  async remove(id: string, ownerUserId: string): Promise<void> {
    const current = await this.transactions.findById(id, ownerUserId);

    if (!current) {
      throw new NotFoundException('Lançamento não encontrado.');
    }

    await this.transactions.remove(id);
  }

  /**
   * Projeção dos próximos 30 dias a partir dos vencimentos em aberto e das
   * baixas já feitas. O saldo é acumulado dia a dia.
   */
  async cashFlow(ownerUserId: string, dias = 30): Promise<CashFlowDay[]> {
    const inicio = hoje();
    const fim = somarDias(inicio, dias - 1);

    const rows = await this.transactions.list({ ownerUserId, from: inicio, to: fim });

    let saldo = 0;

    return Array.from({ length: dias }, (_, indice) => {
      const date = somarDias(inicio, indice);
      const doDia = rows.filter((row) => row.dueDate === date);

      const inflow = doDia
        .filter((row) => row.type === FinancialTransactionType.RECEITA)
        .reduce((total, row) => total + Number(row.amount), 0);
      const outflow = doDia
        .filter((row) => row.type === FinancialTransactionType.DESPESA)
        .reduce((total, row) => total + Number(row.amount), 0);

      saldo += inflow - outflow;

      return { date, inflow, outflow, projectedBalance: saldo };
    });
  }

  async incomeStatement(
    ownerUserId: string,
    filtros: { customerId?: string; from?: string; to?: string },
  ): Promise<IncomeStatement> {
    const rows = await this.transactions.list({
      ownerUserId,
      customerId: filtros.customerId,
      from: filtros.from,
      to: filtros.to,
    });

    const somar = (predicado: (row: FinancialTransactionEntity) => boolean) =>
      rows.filter(predicado).reduce((total, row) => total + Number(row.amount), 0);

    const grossRevenue = somar((row) => row.type === FinancialTransactionType.RECEITA);
    const deductions = somar(
      (row) =>
        row.type === FinancialTransactionType.DESPESA && CATEGORIAS_DEDUCAO.has(row.category),
    );
    const operatingCosts = somar(
      (row) =>
        row.type === FinancialTransactionType.DESPESA &&
        CATEGORIAS_OPERACIONAIS.has(row.category),
    );
    const administrativeExpenses = somar(
      (row) =>
        row.type === FinancialTransactionType.DESPESA &&
        !CATEGORIAS_OPERACIONAIS.has(row.category) &&
        !CATEGORIAS_DEDUCAO.has(row.category),
    );

    const netRevenue = grossRevenue - deductions;
    const grossProfit = netRevenue - operatingCosts;

    return {
      grossRevenue,
      deductions,
      netRevenue,
      operatingCosts,
      grossProfit,
      administrativeExpenses,
      netProfit: grossProfit - administrativeExpenses,
    };
  }

  async listInvoices(ownerUserId: string): Promise<InvoiceResponse[]> {
    const invoices = await this.invoices.list(ownerUserId);
    return invoices.map((invoice) => this.toInvoiceResponse(invoice));
  }

  /**
   * Consolida em uma fatura os fretes concluídos do cliente no período.
   * O valor sai do próprio frete: a fatura não recalcula nada.
   */
  async generateInvoice(dto: GenerateInvoiceDto, ownerUserId: string): Promise<InvoiceResponse> {
    if (dto.periodEnd < dto.periodStart) {
      throw new BadRequestException('A data final não pode ser anterior à inicial.');
    }

    const fretes = await this.freightsService.listar({
      ownerUserId,
      status: 'CONCLUIDO',
      from: new Date(`${dto.periodStart}T00:00:00.000Z`),
      to: new Date(`${dto.periodEnd}T23:59:59.999Z`),
    });

    const doCliente = fretes.filter(
      (frete) => !dto.customerName || frete.clienteNome === dto.customerName,
    );

    if (doCliente.length === 0) {
      throw new BadRequestException('Nenhum frete concluído neste período para faturar.');
    }

    const now = new Date();
    const invoice = new InvoiceEntity({
      id: randomUUID(),
      ownerUserId,
      customerId: dto.customerId,
      freightIds: doCliente.map((frete) => frete.id),
      totalAmount: doCliente.reduce((total, frete) => total + Number(frete.valorFrete), 0),
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      status: InvoiceStatus.EMITIDA,
      createdAt: now,
      updatedAt: now,
    });

    return this.toInvoiceResponse(await this.invoices.create(invoice));
  }
}
