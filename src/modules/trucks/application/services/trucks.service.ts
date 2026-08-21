import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TruckStatus, TruckType } from '@database/typeorm/entities/enums';
import { TruckEntity } from '@trucks/domain/entities/truck.entity';
import { TRUCKS_REPOSITORY, TrucksRepository } from '@trucks/domain/repositories/trucks.repository';
import { CreateTruckDto, normalizePlate } from '@trucks/presentation/dtos/create-truck.dto';
import { UpdateTruckDto } from '@trucks/presentation/dtos/update-truck.dto';

export interface TruckResponse {
  id: string;
  plate: string;
  rntrc: string | null;
  brandModel: string;
  year: number | null;
  type: TruckType;
  capacity: number;
  status: TruckStatus;
  driverId: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class TrucksService {
  constructor(@Inject(TRUCKS_REPOSITORY) private readonly trucksRepository: TrucksRepository) {}

  private toResponse(truck: TruckEntity): TruckResponse {
    return {
      id: truck.id,
      plate: truck.plate,
      rntrc: truck.rntrc ?? null,
      brandModel: truck.brandModel,
      year: truck.year ?? null,
      type: truck.type,
      capacity: Number(truck.capacity),
      status: truck.status,
      driverId: truck.driverId ?? null,
      createdAt: truck.createdAt.toISOString(),
      updatedAt: truck.updatedAt.toISOString(),
    };
  }

  async create(dto: CreateTruckDto): Promise<TruckResponse> {
    const plate = normalizePlate(dto.plate);

    if (await this.trucksRepository.findByPlate(plate)) {
      throw new ConflictException('Já existe um veículo com essa placa.');
    }

    const now = new Date();
    const truck = new TruckEntity({
      id: randomUUID(),
      plate,
      rntrc: dto.rntrc ?? null,
      brandModel: dto.brandModel.trim(),
      year: dto.year ?? null,
      type: dto.type,
      capacity: dto.capacity,
      status: dto.status ?? TruckStatus.ATIVO,
      driverId: dto.driverId ?? null,
      createdAt: now,
      updatedAt: now,
    });

    return this.toResponse(await this.trucksRepository.create(truck));
  }

  async list(status?: TruckStatus): Promise<TruckResponse[]> {
    const trucks = await this.trucksRepository.list(status);
    return trucks.map((truck) => this.toResponse(truck));
  }

  private async getOrFail(id: string): Promise<TruckEntity> {
    const truck = await this.trucksRepository.findById(id);

    if (!truck) {
      throw new NotFoundException('Veículo não encontrado.');
    }

    return truck;
  }

  async findById(id: string): Promise<TruckResponse> {
    return this.toResponse(await this.getOrFail(id));
  }

  async update(id: string, dto: UpdateTruckDto): Promise<TruckResponse> {
    const current = await this.getOrFail(id);

    if (dto.plate !== undefined) {
      const plate = normalizePlate(dto.plate);
      const existing = await this.trucksRepository.findByPlate(plate);

      if (existing && existing.id !== id) {
        throw new ConflictException('Já existe um veículo com essa placa.');
      }
    }

    const updated = new TruckEntity({
      ...current,
      plate: dto.plate === undefined ? current.plate : normalizePlate(dto.plate),
      rntrc: dto.rntrc === undefined ? current.rntrc : dto.rntrc,
      brandModel: dto.brandModel === undefined ? current.brandModel : dto.brandModel.trim(),
      year: dto.year === undefined ? current.year : dto.year,
      type: dto.type ?? current.type,
      capacity: dto.capacity ?? current.capacity,
      status: dto.status ?? current.status,
      driverId: dto.driverId === undefined ? current.driverId : dto.driverId,
      updatedAt: new Date(),
    });

    return this.toResponse(await this.trucksRepository.update(id, updated));
  }

  async remove(id: string): Promise<void> {
    await this.getOrFail(id);
    await this.trucksRepository.remove(id);
  }
}
