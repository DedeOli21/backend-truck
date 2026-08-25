import { FinancialTransactionType } from '@database/typeorm/entities/enums';
import { FinancialTransactionEntity } from '@applications/financial/domain/entities/financial-transaction.entity';
import { InvoiceEntity } from '@applications/financial/domain/entities/invoice.entity';

export const FINANCIAL_TRANSACTIONS_REPOSITORY = 'FINANCIAL_TRANSACTIONS_REPOSITORY';
export const INVOICES_REPOSITORY = 'INVOICES_REPOSITORY';

export interface FinancialTransactionFilters {
  /** Gestor dono dos lançamentos. Obrigatório: ninguém lista fora do próprio escopo. */
  ownerUserId: string;
  type?: FinancialTransactionType;
  customerId?: string;
  freightId?: string;
  /** Só lançamentos originados de CT-e. */
  somenteCte?: boolean;
  /** Intervalo de vencimento, em ISO (YYYY-MM-DD). */
  from?: string;
  to?: string;
}

export interface FinancialTransactionsRepository {
  create(transaction: FinancialTransactionEntity): Promise<FinancialTransactionEntity>;
  findById(id: string, ownerUserId: string): Promise<FinancialTransactionEntity | null>;
  /** Lançamento já feito para esta chave de CT-e; garante que não se lança duas vezes. */
  findByCteChave(
    cteChave: string,
    ownerUserId: string,
  ): Promise<FinancialTransactionEntity | null>;
  list(filters: FinancialTransactionFilters): Promise<FinancialTransactionEntity[]>;
  update(id: string, transaction: FinancialTransactionEntity): Promise<FinancialTransactionEntity>;
  remove(id: string): Promise<void>;
}

export interface InvoicesRepository {
  create(invoice: InvoiceEntity): Promise<InvoiceEntity>;
  list(ownerUserId: string): Promise<InvoiceEntity[]>;
}
