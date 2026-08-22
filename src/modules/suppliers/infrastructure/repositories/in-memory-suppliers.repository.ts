import { Injectable } from '@nestjs/common';
import { SupplierEntity } from '@applications/suppliers/domain/entities/supplier.entity';
import { SupplierFilters, SuppliersRepository } from '@applications/suppliers/domain/repositories/suppliers.repository';

@Injectable()
export class InMemorySuppliersRepository implements SuppliersRepository {
  private readonly records = new Map<string, SupplierEntity>();

  async create(record: SupplierEntity): Promise<SupplierEntity> {
    this.records.set(record.id, record);
    return record;
  }

  async findById(id: string, ownerUserId: string): Promise<SupplierEntity | null> {
    const record = this.records.get(id);
    return record && record.ownerUserId === ownerUserId ? record : null;
  }

  async list(filters: SupplierFilters): Promise<SupplierEntity[]> {
    const search = filters.search?.toLowerCase();

    return [...this.records.values()]
      .filter((record) => record.ownerUserId === filters.ownerUserId)
      .filter((record) => !search || String(record.name).toLowerCase().includes(search))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }

  async update(id: string, record: SupplierEntity): Promise<SupplierEntity> {
    this.records.set(id, record);
    return record;
  }

  async remove(id: string): Promise<void> {
    this.records.delete(id);
  }
}
