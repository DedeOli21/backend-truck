import { Injectable } from '@nestjs/common';
import { CustomerEntity } from '@applications/customers/domain/entities/customer.entity';
import { CustomerFilters, CustomersRepository } from '@applications/customers/domain/repositories/customers.repository';

@Injectable()
export class InMemoryCustomersRepository implements CustomersRepository {
  private readonly records = new Map<string, CustomerEntity>();

  async create(record: CustomerEntity): Promise<CustomerEntity> {
    this.records.set(record.id, record);
    return record;
  }

  async findById(id: string, ownerUserId: string): Promise<CustomerEntity | null> {
    const record = this.records.get(id);
    return record && record.ownerUserId === ownerUserId ? record : null;
  }

  async list(filters: CustomerFilters): Promise<CustomerEntity[]> {
    const search = filters.search?.toLowerCase();

    return [...this.records.values()]
      .filter((record) => record.ownerUserId === filters.ownerUserId)
      .filter((record) => !search || String(record.name).toLowerCase().includes(search))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }

  async update(id: string, record: CustomerEntity): Promise<CustomerEntity> {
    this.records.set(id, record);
    return record;
  }

  async remove(id: string): Promise<void> {
    this.records.delete(id);
  }
}
