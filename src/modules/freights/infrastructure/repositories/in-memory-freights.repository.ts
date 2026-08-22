import { Injectable } from '@nestjs/common';
import { FreightEntity } from '@freights/domain/entities/freight.entity';
import {
  FreightFilters,
  FreightsRepository,
} from '@freights/domain/repositories/freights.repository';

@Injectable()
export class InMemoryFreightsRepository implements FreightsRepository {
  private readonly fretes = new Map<string, FreightEntity>();

  async save(freight: FreightEntity): Promise<FreightEntity> {
    this.fretes.set(freight.id, freight);
    return freight;
  }

  async findById(id: string): Promise<FreightEntity | null> {
    return this.fretes.get(id) ?? null;
  }

  async findByCodigo(codigo: string): Promise<FreightEntity | null> {
    return [...this.fretes.values()].find((frete) => frete.codigo === codigo) ?? null;
  }

  async list(filtros: FreightFilters): Promise<FreightEntity[]> {
    return [...this.fretes.values()]
      .filter((frete) => !filtros.status || frete.status === filtros.status)
      .filter((frete) => !filtros.truckId || frete.truckId === filtros.truckId)
      .filter((frete) => !filtros.driverId || frete.driverId === filtros.driverId)
      .filter((frete) => !filtros.from || frete.createdAt >= filtros.from)
      .filter((frete) => !filtros.to || frete.createdAt <= filtros.to)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async remove(id: string): Promise<void> {
    this.fretes.delete(id);
  }
}
