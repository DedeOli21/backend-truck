import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SupplierEntity } from '@applications/suppliers/domain/entities/supplier.entity';
import {
  SUPPLIERS_REPOSITORY,
  SuppliersRepository,
} from '@applications/suppliers/domain/repositories/suppliers.repository';
import { CreateSupplierDto } from '@applications/suppliers/presentation/dtos/create-supplier.dto';
import { ListSuppliersQuery } from '@applications/suppliers/presentation/dtos/list-suppliers.query';
import { UpdateSupplierDto } from '@applications/suppliers/presentation/dtos/update-supplier.dto';

export interface SupplierResponse {
  id: string;
  name: string;
  taxId: string;
  serviceType: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class SuppliersService {
  constructor(
    @Inject(SUPPLIERS_REPOSITORY)
    private readonly repository: SuppliersRepository,
  ) {}

  private toResponse(record: SupplierEntity): SupplierResponse {
    return {
      id: record.id,
      name: record.name,
      taxId: record.taxId,
      serviceType: record.serviceType,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private async getOrFail(id: string, ownerUserId: string): Promise<SupplierEntity> {
    const record = await this.repository.findById(id, ownerUserId);

    if (!record) {
      throw new NotFoundException('Fornecedor não encontrado.');
    }

    return record;
  }

  async create(dto: CreateSupplierDto, ownerUserId: string): Promise<SupplierResponse> {
    const now = new Date();

    const record = new SupplierEntity({
      id: randomUUID(),
      ownerUserId,
      name: dto.name,
      taxId: dto.taxId,
      serviceType: dto.serviceType,
      createdAt: now,
      updatedAt: now,
    });

    return this.toResponse(await this.repository.create(record));
  }

  async list(query: ListSuppliersQuery, ownerUserId: string): Promise<SupplierResponse[]> {
    const records = await this.repository.list({ ownerUserId, search: query.search });
    return records.map((record) => this.toResponse(record));
  }

  async findById(id: string, ownerUserId: string): Promise<SupplierResponse> {
    return this.toResponse(await this.getOrFail(id, ownerUserId));
  }

  async update(id: string, dto: UpdateSupplierDto, ownerUserId: string): Promise<SupplierResponse> {
    const current = await this.getOrFail(id, ownerUserId);

    const updated = new SupplierEntity({
      ...current,
      name: dto.name ?? current.name,
      taxId: dto.taxId ?? current.taxId,
      serviceType: dto.serviceType ?? current.serviceType,
      updatedAt: new Date(),
    });

    return this.toResponse(await this.repository.update(id, updated));
  }

  async remove(id: string, ownerUserId: string): Promise<void> {
    await this.getOrFail(id, ownerUserId);
    await this.repository.remove(id);
  }
}
