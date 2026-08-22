import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { VehicleExpenseCategory } from '@database/typeorm/entities/enums';
import { DriversService } from '@applications/drivers/application/services/drivers.service';
import { TrucksService } from '@trucks/application/services/trucks.service';
import { VehicleExpenseEntity } from '@vehicle-expenses/domain/entities/vehicle-expense.entity';
import {
  VEHICLE_EXPENSES_REPOSITORY,
  VehicleExpensesRepository,
} from '@vehicle-expenses/domain/repositories/vehicle-expenses.repository';
import { CreateVehicleExpenseDto } from '@vehicle-expenses/presentation/dtos/create-vehicle-expense.dto';
import { ListVehicleExpensesQuery } from '@vehicle-expenses/presentation/dtos/list-vehicle-expenses.query';
import { UpdateVehicleExpenseDto } from '@vehicle-expenses/presentation/dtos/update-vehicle-expense.dto';

export interface VehicleExpenseActor {
  userId: string;
  role: 'ADMIN' | 'DRIVER';
}

/** Escopo impossível: não casa com nenhum uuid, então a consulta volta vazia. */
const SEM_ESCOPO = '__sem-gestor__';

export interface VehicleExpenseResponse {
  id: string;
  truckId: string;
  driverId: string;
  category: VehicleExpenseCategory;
  description: string | null;
  amount: number;
  spentAt: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class VehicleExpensesService {
  constructor(
    @Inject(VEHICLE_EXPENSES_REPOSITORY)
    private readonly expensesRepository: VehicleExpensesRepository,
    @Inject(DriversService) private readonly driversService: DriversService,
    @Inject(TrucksService) private readonly trucksService: TrucksService,
  ) {}

  private toResponse(expense: VehicleExpenseEntity): VehicleExpenseResponse {
    return {
      id: expense.id,
      truckId: expense.truckId,
      driverId: expense.driverId,
      category: expense.category,
      description: expense.description ?? null,
      amount: Number(expense.amount),
      spentAt: expense.spentAt.toISOString(),
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  }

  // A identidade do motorista nunca vem do corpo da requisição quando quem lança é o próprio.
  private async resolveDriverId(
    actor: VehicleExpenseActor,
    dtoDriverId?: string,
  ): Promise<string> {
    if (actor.role === 'ADMIN') {
      if (!dtoDriverId) {
        throw new BadRequestException('Informe o motorista do gasto.');
      }

      return dtoDriverId;
    }

    const driverId = await this.driversService.findIdByUserId(actor.userId);

    if (!driverId) {
      throw new ForbiddenException('Seu usuário não está vinculado a um motorista.');
    }

    return driverId;
  }

  private async assertCanTouch(
    expense: VehicleExpenseEntity,
    actor: VehicleExpenseActor,
  ): Promise<void> {
    if (actor.role === 'ADMIN') {
      return;
    }

    const driverId = await this.driversService.findIdByUserId(actor.userId);

    if (expense.driverId !== driverId) {
      throw new ForbiddenException('Este gasto pertence a outro motorista.');
    }
  }

  /**
   * Gestor dono dos dados que este usuário enxerga: ADMIN é dono de si,
   * motorista herda o gestor que o cadastrou.
   */
  private async escopoDe(actor: VehicleExpenseActor): Promise<string> {
    const escopo = await this.driversService.escopoDoUsuario(actor.userId, actor.role);
    return escopo ?? SEM_ESCOPO;
  }

  private async getOrFail(id: string, ownerUserId?: string): Promise<VehicleExpenseEntity> {
    const expense = await this.expensesRepository.findById(id, ownerUserId);

    if (!expense) {
      throw new NotFoundException('Gasto não encontrado.');
    }

    return expense;
  }

  async create(
    dto: CreateVehicleExpenseDto,
    actor: VehicleExpenseActor,
  ): Promise<VehicleExpenseResponse> {
    // Sem esta checagem a violação de chave estrangeira sobe como 500.
    const escopo = await this.escopoDe(actor);
    // O veículo precisa ser da frota do gestor: id de outra frota vira 404.
    await this.trucksService.findById(dto.truckId, escopo);
    const driverId = await this.resolveDriverId(actor, dto.driverId);
    const now = new Date();

    const expense = new VehicleExpenseEntity({
      id: randomUUID(),
      ownerUserId: escopo,
      truckId: dto.truckId,
      driverId,
      category: dto.category,
      description: dto.description ?? null,
      amount: dto.amount,
      spentAt: new Date(dto.spentAt),
      createdAt: now,
      updatedAt: now,
    });

    return this.toResponse(await this.expensesRepository.create(expense));
  }

  async list(
    query: ListVehicleExpensesQuery,
    actor: VehicleExpenseActor,
  ): Promise<VehicleExpenseResponse[]> {
    // Motorista enxerga apenas os próprios gastos, independente do que pedir na query.
    const driverId =
      actor.role === 'ADMIN'
        ? query.driverId
        : ((await this.driversService.findIdByUserId(actor.userId)) ?? '__sem-motorista__');

    const expenses = await this.expensesRepository.list({
      ownerUserId: await this.escopoDe(actor),
      truckId: query.truckId,
      driverId,
      category: query.category,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });

    return expenses.map((expense) => this.toResponse(expense));
  }

  async findById(id: string, actor: VehicleExpenseActor): Promise<VehicleExpenseResponse> {
    const expense = await this.getOrFail(id, await this.escopoDe(actor));
    await this.assertCanTouch(expense, actor);

    return this.toResponse(expense);
  }

  async update(
    id: string,
    dto: UpdateVehicleExpenseDto,
    actor: VehicleExpenseActor,
  ): Promise<VehicleExpenseResponse> {
    const current = await this.getOrFail(id, await this.escopoDe(actor));
    await this.assertCanTouch(current, actor);

    if (dto.truckId) {
      await this.trucksService.findById(dto.truckId, await this.escopoDe(actor));
    }

    const updated = new VehicleExpenseEntity({
      ...current,
      truckId: dto.truckId ?? current.truckId,
      // driverId só muda por ação de ADMIN; motorista não transfere lançamento.
      driverId: actor.role === 'ADMIN' ? (dto.driverId ?? current.driverId) : current.driverId,
      category: dto.category ?? current.category,
      description: dto.description === undefined ? current.description : dto.description,
      amount: dto.amount ?? current.amount,
      spentAt: dto.spentAt ? new Date(dto.spentAt) : current.spentAt,
      updatedAt: new Date(),
    });

    return this.toResponse(await this.expensesRepository.update(id, updated));
  }

  async remove(id: string, actor: VehicleExpenseActor): Promise<void> {
    const expense = await this.getOrFail(id, await this.escopoDe(actor));
    await this.assertCanTouch(expense, actor);

    await this.expensesRepository.remove(id);
  }
}
