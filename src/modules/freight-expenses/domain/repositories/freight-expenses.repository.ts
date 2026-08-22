import { FreightExpenseEntity } from '@applications/freight-expenses/domain/entities/freight-expense.entity';

export const FREIGHT_EXPENSES_REPOSITORY = 'FREIGHT_EXPENSES_REPOSITORY';

export interface FreightExpensesRepository {
  create(expense: FreightExpenseEntity): Promise<FreightExpenseEntity>;
  findById(id: string): Promise<FreightExpenseEntity | null>;
  listByFreight(freightId: string): Promise<FreightExpenseEntity[]>;
  /** Soma das despesas de cada frete informado, para o resumo financeiro. */
  totalsByFreight(freightIds: string[]): Promise<Map<string, number>>;
  remove(id: string): Promise<void>;
}
