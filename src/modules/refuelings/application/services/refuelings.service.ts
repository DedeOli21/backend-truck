import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DriversService } from '@applications/drivers/application/services/drivers.service';
import { TrucksService } from '@trucks/application/services/trucks.service';
import { RefuelingEntity } from '@refuelings/domain/entities/refueling.entity';
import {
  REFUELINGS_REPOSITORY,
  RefuelingsRepository,
} from '@refuelings/domain/repositories/refuelings.repository';
import { CreateRefuelingDto } from '@refuelings/presentation/dtos/create-refueling.dto';
import { ListRefuelingsQuery } from '@refuelings/presentation/dtos/list-refuelings.query';
import { UpdateRefuelingDto } from '@refuelings/presentation/dtos/update-refueling.dto';

export interface RefuelingActor {
  userId: string;
  role: 'ADMIN' | 'DRIVER';
}

export interface RefuelingResponse {
  id: string;
  truckId: string;
  driverId: string;
  liters: number;
  pricePerLiter: number;
  totalAmount: number;
  odometer: number;
  gasStationName: string | null;
  refueledAt: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class RefuelingsService {
  constructor(
    @Inject(REFUELINGS_REPOSITORY) private readonly refuelingsRepository: RefuelingsRepository,
    @Inject(DriversService) private readonly driversService: DriversService,
    @Inject(TrucksService) private readonly trucksService: TrucksService,
  ) {}

  private toResponse(refueling: RefuelingEntity): RefuelingResponse {
    return {
      id: refueling.id,
      truckId: refueling.truckId,
      driverId: refueling.driverId,
      liters: Number(refueling.liters),
      pricePerLiter: Number(refueling.pricePerLiter),
      totalAmount: Number(refueling.totalAmount),
      odometer: refueling.odometer,
      gasStationName: refueling.gasStationName ?? null,
      refueledAt: refueling.refueledAt.toISOString(),
      createdAt: refueling.createdAt.toISOString(),
      updatedAt: refueling.updatedAt.toISOString(),
    };
  }

  // A identidade do motorista nunca vem do corpo da requisição quando quem lança é o próprio.
  private async resolveDriverId(actor: RefuelingActor, dtoDriverId?: string): Promise<string> {
    if (actor.role === 'ADMIN') {
      if (!dtoDriverId) {
        throw new BadRequestException('Informe o motorista do abastecimento.');
      }

      return dtoDriverId;
    }

    const driverId = await this.driversService.findIdByUserId(actor.userId);

    if (!driverId) {
      throw new ForbiddenException('Seu usuário não está vinculado a um motorista.');
    }

    return driverId;
  }

  private async assertCanTouch(refueling: RefuelingEntity, actor: RefuelingActor): Promise<void> {
    if (actor.role === 'ADMIN') {
      return;
    }

    const driverId = await this.driversService.findIdByUserId(actor.userId);

    if (refueling.driverId !== driverId) {
      throw new ForbiddenException('Este abastecimento pertence a outro motorista.');
    }
  }

  private async getOrFail(id: string): Promise<RefuelingEntity> {
    const refueling = await this.refuelingsRepository.findById(id);

    if (!refueling) {
      throw new NotFoundException('Abastecimento não encontrado.');
    }

    return refueling;
  }

  async create(dto: CreateRefuelingDto, actor: RefuelingActor): Promise<RefuelingResponse> {
    // Sem esta checagem a violação de chave estrangeira sobe como 500.
    await this.trucksService.findById(dto.truckId);
    const driverId = await this.resolveDriverId(actor, dto.driverId);
    const now = new Date();

    const refueling = new RefuelingEntity({
      id: randomUUID(),
      truckId: dto.truckId,
      driverId,
      liters: dto.liters,
      pricePerLiter: dto.totalAmount / dto.liters,
      totalAmount: dto.totalAmount,
      odometer: dto.odometer,
      gasStationName: dto.gasStationName ?? null,
      refueledAt: new Date(dto.refueledAt),
      createdAt: now,
      updatedAt: now,
    });

    return this.toResponse(await this.refuelingsRepository.create(refueling));
  }

  async list(query: ListRefuelingsQuery, actor: RefuelingActor): Promise<RefuelingResponse[]> {
    // Motorista enxerga apenas o próprio histórico, independente do que pedir na query.
    const driverId =
      actor.role === 'ADMIN'
        ? query.driverId
        : ((await this.driversService.findIdByUserId(actor.userId)) ?? '__sem-motorista__');

    const refuelings = await this.refuelingsRepository.list({
      truckId: query.truckId,
      driverId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });

    return refuelings.map((refueling) => this.toResponse(refueling));
  }

  async findById(id: string, actor: RefuelingActor): Promise<RefuelingResponse> {
    const refueling = await this.getOrFail(id);
    await this.assertCanTouch(refueling, actor);

    return this.toResponse(refueling);
  }

  async update(
    id: string,
    dto: UpdateRefuelingDto,
    actor: RefuelingActor,
  ): Promise<RefuelingResponse> {
    const current = await this.getOrFail(id);
    await this.assertCanTouch(current, actor);

    if (dto.truckId) {
      await this.trucksService.findById(dto.truckId);
    }

    const liters = dto.liters ?? current.liters;
    const totalAmount = dto.totalAmount ?? current.totalAmount;

    const updated = new RefuelingEntity({
      ...current,
      truckId: dto.truckId ?? current.truckId,
      // driverId só muda por ação de ADMIN; motorista não transfere lançamento.
      driverId: actor.role === 'ADMIN' ? (dto.driverId ?? current.driverId) : current.driverId,
      liters,
      totalAmount,
      pricePerLiter: totalAmount / liters,
      odometer: dto.odometer ?? current.odometer,
      gasStationName: dto.gasStationName === undefined ? current.gasStationName : dto.gasStationName,
      refueledAt: dto.refueledAt ? new Date(dto.refueledAt) : current.refueledAt,
      updatedAt: new Date(),
    });

    return this.toResponse(await this.refuelingsRepository.update(id, updated));
  }

  async remove(id: string, actor: RefuelingActor): Promise<void> {
    const refueling = await this.getOrFail(id);
    await this.assertCanTouch(refueling, actor);

    await this.refuelingsRepository.remove(id);
  }
}
