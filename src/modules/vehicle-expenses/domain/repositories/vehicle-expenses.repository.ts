import { VehicleExpenseCategory } from '@database/typeorm/entities/enums';
import { VehicleExpenseEntity } from '@vehicle-expenses/domain/entities/vehicle-expense.entity';

export const VEHICLE_EXPENSES_REPOSITORY = 'VEHICLE_EXPENSES_REPOSITORY';

export interface VehicleExpenseFilters {
  /** Gestor dono dos registros. Obrigatório: ninguém lista fora do próprio escopo. */
  ownerUserId?: string;
  truckId?: string;
  driverId?: string;
  category?: VehicleExpenseCategory;
  from?: Date;
  to?: Date;
}

export interface VehicleExpensesRepository {
  create(expense: VehicleExpenseEntity): Promise<VehicleExpenseEntity>;
  findById(id: string, ownerUserId?: string): Promise<VehicleExpenseEntity | null>;
  list(filters: VehicleExpenseFilters): Promise<VehicleExpenseEntity[]>;
  update(id: string, expense: VehicleExpenseEntity): Promise<VehicleExpenseEntity>;
  remove(id: string): Promise<void>;
}
