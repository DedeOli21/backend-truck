import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupplierOrmEntity } from '@database/typeorm/entities/supplier.orm-entity';
import { SupplierEntity } from '@applications/suppliers/domain/entities/supplier.entity';
import { SupplierFilters, SuppliersRepository } from '@applications/suppliers/domain/repositories/suppliers.repository';

@Injectable()
export class PostgresSuppliersRepository implements SuppliersRepository {
  constructor(
    @InjectRepository(SupplierOrmEntity)
    private readonly repository: Repository<SupplierOrmEntity>,
  ) {}

  private toDomain(row: SupplierOrmEntity): SupplierEntity {
    return new SupplierEntity({
      id: row.id,
      ownerUserId: row.ownerUserId,
      name: row.name,
      taxId: row.taxId,
      serviceType: row.serviceType,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toRow(record: SupplierEntity) {
    return {
      ownerUserId: record.ownerUserId,
      name: record.name,
      taxId: record.taxId,
      serviceType: record.serviceType,
    };
  }

  async create(record: SupplierEntity): Promise<SupplierEntity> {
    const row = this.repository.create({ id: record.id, ...this.toRow(record) });
    return this.toDomain(await this.repository.save(row));
  }

  async findById(id: string, ownerUserId: string): Promise<SupplierEntity | null> {
    const row = await this.repository.findOne({ where: { id, ownerUserId } });
    return row ? this.toDomain(row) : null;
  }

  async list(filters: SupplierFilters): Promise<SupplierEntity[]> {
    const query = this.repository
      .createQueryBuilder('supplier')
      .where('supplier.owner_user_id = :ownerUserId', { ownerUserId: filters.ownerUserId });

    if (filters.search) {
      query.andWhere('supplier.name ILIKE :search', { search: `%${filters.search}%` });
    }

    const rows = await query.orderBy('supplier.name', 'ASC').getMany();
    return rows.map((row) => this.toDomain(row));
  }

  async update(id: string, record: SupplierEntity): Promise<SupplierEntity> {
    await this.repository.update(id, this.toRow(record));
    return this.toDomain(await this.repository.findOneOrFail({ where: { id } }));
  }

  async remove(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
