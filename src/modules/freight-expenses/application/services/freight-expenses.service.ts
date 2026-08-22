import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FreightExpenseType } from '@database/typeorm/entities/enums';
import { FreightsService } from '@freights/application/services/freights.service';
import { FreightStatus } from '@freights/domain/entities/freight.entity';
import { FreightExpenseEntity } from '@applications/freight-expenses/domain/entities/freight-expense.entity';
import { FreightTimelineEventEntity } from '@applications/freight-expenses/domain/entities/freight-timeline-event.entity';
import {
  FREIGHT_EXPENSES_REPOSITORY,
  FreightExpensesRepository,
} from '@applications/freight-expenses/domain/repositories/freight-expenses.repository';
import {
  FREIGHT_TIMELINE_REPOSITORY,
  FreightTimelineRepository,
} from '@applications/freight-expenses/domain/repositories/freight-timeline.repository';
import { CreateFreightExpenseDto } from '@applications/freight-expenses/presentation/dtos/create-freight-expense.dto';

export interface FreightExpenseResponse {
  id: string;
  freightId: string;
  type: FreightExpenseType;
  amount: number;
  description: string | null;
  receiptUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FreightTimelineEventResponse {
  id: string;
  freightId: string;
  title: string;
  description: string | null;
  status: string;
  updatedBy: string;
  createdAt: string;
}

export interface FreightFinancialSummaryResponse {
  totalValue: number;
  totalExpenses: number;
  netProfit: number;
  marginPercentage: number;
}

/** Rótulo de cada transição, para a timeline ficar legível sem consulta extra. */
const TITULO_POR_STATUS: Record<FreightStatus, string> = {
  AGENDADO: 'Frete agendado',
  EM_TRANSITO: 'Frete em trânsito',
  CONCLUIDO: 'Entrega concluída',
  CANCELADO: 'Frete cancelado',
};

@Injectable()
export class FreightExpensesService {
  constructor(
    @Inject(FREIGHT_EXPENSES_REPOSITORY)
    private readonly expensesRepository: FreightExpensesRepository,
    @Inject(FREIGHT_TIMELINE_REPOSITORY)
    private readonly timelineRepository: FreightTimelineRepository,
    @Inject(FreightsService) private readonly freightsService: FreightsService,
  ) {}

  private toExpenseResponse(expense: FreightExpenseEntity): FreightExpenseResponse {
    return {
      id: expense.id,
      freightId: expense.freightId,
      type: expense.type,
      amount: Number(expense.amount),
      description: expense.description ?? null,
      receiptUrl: expense.receiptUrl ?? null,
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  }

  private toEventResponse(event: FreightTimelineEventEntity): FreightTimelineEventResponse {
    return {
      id: event.id,
      freightId: event.freightId,
      title: event.title,
      description: event.description ?? null,
      status: event.status,
      updatedBy: event.updatedBy,
      createdAt: event.createdAt.toISOString(),
    };
  }

  async create(
    freightId: string,
    dto: CreateFreightExpenseDto,
  ): Promise<FreightExpenseResponse> {
    // Sem esta checagem a violação de chave estrangeira sobe como 500.
    await this.freightsService.buscar(freightId);
    const now = new Date();

    const expense = new FreightExpenseEntity({
      id: randomUUID(),
      freightId,
      type: dto.type,
      amount: dto.amount,
      description: dto.description ?? null,
      receiptUrl: dto.receiptUrl ?? null,
      createdAt: now,
      updatedAt: now,
    });

    return this.toExpenseResponse(await this.expensesRepository.create(expense));
  }

  async listByFreight(freightId: string): Promise<FreightExpenseResponse[]> {
    await this.freightsService.buscar(freightId);
    const expenses = await this.expensesRepository.listByFreight(freightId);

    return expenses.map((expense) => this.toExpenseResponse(expense));
  }

  async remove(freightId: string, id: string): Promise<void> {
    const expense = await this.expensesRepository.findById(id);

    if (!expense || expense.freightId !== freightId) {
      throw new NotFoundException('Despesa não encontrada para este frete.');
    }

    await this.expensesRepository.remove(id);
  }

  async summary(freightId: string): Promise<FreightFinancialSummaryResponse> {
    const frete = await this.freightsService.buscar(freightId);
    const expenses = await this.expensesRepository.listByFreight(freightId);

    const totalValue = Number(frete.valorFrete);
    const totalExpenses = expenses.reduce((total, expense) => total + Number(expense.amount), 0);
    const netProfit = totalValue - totalExpenses;

    return {
      totalValue,
      totalExpenses,
      netProfit,
      // Frete sem valor lançado não tem margem definida; 0 evita divisão por zero.
      marginPercentage: totalValue > 0 ? Number(((netProfit / totalValue) * 100).toFixed(2)) : 0,
    };
  }

  /** Soma de despesas por frete, usada pelos relatórios financeiros. */
  async totalsByFreight(freightIds: string[]): Promise<Map<string, number>> {
    return this.expensesRepository.totalsByFreight(freightIds);
  }

  async timeline(freightId: string): Promise<FreightTimelineEventResponse[]> {
    await this.freightsService.buscar(freightId);
    const events = await this.timelineRepository.listByFreight(freightId);

    return events.map((event) => this.toEventResponse(event));
  }

  async registrarEvento(
    freightId: string,
    status: FreightStatus,
    updatedBy: string,
    description?: string | null,
  ): Promise<FreightTimelineEventResponse> {
    const event = new FreightTimelineEventEntity({
      id: randomUUID(),
      freightId,
      title: TITULO_POR_STATUS[status] ?? 'Frete atualizado',
      description: description ?? null,
      status,
      updatedBy,
      createdAt: new Date(),
    });

    return this.toEventResponse(await this.timelineRepository.create(event));
  }
}
