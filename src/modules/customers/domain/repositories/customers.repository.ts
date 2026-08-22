import { CustomerEntity } from '@applications/customers/domain/entities/customer.entity';

export const CUSTOMERS_REPOSITORY = 'CUSTOMERS_REPOSITORY';

export interface CustomerFilters {
  /** Gestor dono dos registros. Obrigatório: ninguém lista fora do próprio escopo. */
  ownerUserId: string;
  /** Busca livre por nome (case-insensitive). */
  search?: string;
}

export interface CustomersRepository {
  create(record: CustomerEntity): Promise<CustomerEntity>;
  findById(id: string, ownerUserId: string): Promise<CustomerEntity | null>;
  list(filters: CustomerFilters): Promise<CustomerEntity[]>;
  update(id: string, record: CustomerEntity): Promise<CustomerEntity>;
  remove(id: string): Promise<void>;
}
