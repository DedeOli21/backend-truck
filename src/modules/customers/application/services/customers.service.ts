import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CustomerEntity } from '@applications/customers/domain/entities/customer.entity';
import {
  CUSTOMERS_REPOSITORY,
  CustomersRepository,
} from '@applications/customers/domain/repositories/customers.repository';
import { CreateCustomerDto } from '@applications/customers/presentation/dtos/create-customer.dto';
import { ListCustomersQuery } from '@applications/customers/presentation/dtos/list-customers.query';
import { UpdateCustomerDto } from '@applications/customers/presentation/dtos/update-customer.dto';

export interface CustomerResponse {
  id: string;
  name: string;
  taxId: string;
  phone: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class CustomersService {
  constructor(
    @Inject(CUSTOMERS_REPOSITORY)
    private readonly repository: CustomersRepository,
  ) {}

  private toResponse(record: CustomerEntity): CustomerResponse {
    return {
      id: record.id,
      name: record.name,
      taxId: record.taxId,
      phone: record.phone,
      address: record.address,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private async getOrFail(id: string, ownerUserId: string): Promise<CustomerEntity> {
    const record = await this.repository.findById(id, ownerUserId);

    if (!record) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    return record;
  }

  async create(dto: CreateCustomerDto, ownerUserId: string): Promise<CustomerResponse> {
    const now = new Date();

    const record = new CustomerEntity({
      id: randomUUID(),
      ownerUserId,
      name: dto.name,
      taxId: dto.taxId,
      phone: dto.phone,
      address: dto.address,
      createdAt: now,
      updatedAt: now,
    });

    return this.toResponse(await this.repository.create(record));
  }

  async list(query: ListCustomersQuery, ownerUserId: string): Promise<CustomerResponse[]> {
    const records = await this.repository.list({ ownerUserId, search: query.search });
    return records.map((record) => this.toResponse(record));
  }

  async findById(id: string, ownerUserId: string): Promise<CustomerResponse> {
    return this.toResponse(await this.getOrFail(id, ownerUserId));
  }

  async update(id: string, dto: UpdateCustomerDto, ownerUserId: string): Promise<CustomerResponse> {
    const current = await this.getOrFail(id, ownerUserId);

    const updated = new CustomerEntity({
      ...current,
      name: dto.name ?? current.name,
      taxId: dto.taxId ?? current.taxId,
      phone: dto.phone ?? current.phone,
      address: dto.address ?? current.address,
      updatedAt: new Date(),
    });

    return this.toResponse(await this.repository.update(id, updated));
  }

  async remove(id: string, ownerUserId: string): Promise<void> {
    await this.getOrFail(id, ownerUserId);
    await this.repository.remove(id);
  }
}
