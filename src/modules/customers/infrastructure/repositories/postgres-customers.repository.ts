import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerOrmEntity } from '@database/typeorm/entities/customer.orm-entity';
import { CustomerEntity } from '@applications/customers/domain/entities/customer.entity';
import { CustomerFilters, CustomersRepository } from '@applications/customers/domain/repositories/customers.repository';

@Injectable()
export class PostgresCustomersRepository implements CustomersRepository {
  constructor(
    @InjectRepository(CustomerOrmEntity)
    private readonly repository: Repository<CustomerOrmEntity>,
  ) {}

  private toDomain(row: CustomerOrmEntity): CustomerEntity {
    return new CustomerEntity({
      id: row.id,
      ownerUserId: row.ownerUserId,
      name: row.name,
      taxId: row.taxId,
      phone: row.phone,
      address: row.address,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toRow(record: CustomerEntity) {
    return {
      ownerUserId: record.ownerUserId,
      name: record.name,
      taxId: record.taxId,
      phone: record.phone,
      address: record.address,
    };
  }

  async create(record: CustomerEntity): Promise<CustomerEntity> {
    const row = this.repository.create({ id: record.id, ...this.toRow(record) });
    return this.toDomain(await this.repository.save(row));
  }

  async findById(id: string, ownerUserId: string): Promise<CustomerEntity | null> {
    const row = await this.repository.findOne({ where: { id, ownerUserId } });
    return row ? this.toDomain(row) : null;
  }

  async list(filters: CustomerFilters): Promise<CustomerEntity[]> {
    const query = this.repository
      .createQueryBuilder('customer')
      .where('customer.owner_user_id = :ownerUserId', { ownerUserId: filters.ownerUserId });

    if (filters.search) {
      query.andWhere('customer.name ILIKE :search', { search: `%${filters.search}%` });
    }

    const rows = await query.orderBy('customer.name', 'ASC').getMany();
    return rows.map((row) => this.toDomain(row));
  }

  async update(id: string, record: CustomerEntity): Promise<CustomerEntity> {
    await this.repository.update(id, this.toRow(record));
    return this.toDomain(await this.repository.findOneOrFail({ where: { id } }));
  }

  async remove(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
