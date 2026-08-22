import { SupplierEntity } from '@applications/suppliers/domain/entities/supplier.entity';

export const SUPPLIERS_REPOSITORY = 'SUPPLIERS_REPOSITORY';

export interface SupplierFilters {
  /** Gestor dono dos registros. Obrigatório: ninguém lista fora do próprio escopo. */
  ownerUserId: string;
  /** Busca livre por nome (case-insensitive). */
  search?: string;
}

export interface SuppliersRepository {
  create(record: SupplierEntity): Promise<SupplierEntity>;
  findById(id: string, ownerUserId: string): Promise<SupplierEntity | null>;
  list(filters: SupplierFilters): Promise<SupplierEntity[]>;
  update(id: string, record: SupplierEntity): Promise<SupplierEntity>;
  remove(id: string): Promise<void>;
}
