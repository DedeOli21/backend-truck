export enum UserRole {
  ADMIN = 'ADMIN',
  DRIVER = 'DRIVER',
}

export enum TransactionDirection {
  IN = 'IN',
  OUT = 'OUT',
}

export enum TransactionCategory {
  FREIGHT = 'FREIGHT',
  FUEL = 'FUEL',
  MAINTENANCE = 'MAINTENANCE',
  INSURANCE = 'INSURANCE',
  FINANCING = 'FINANCING',
}

export enum PayableCategoryDb {
  INSURANCE = 'INSURANCE',
  MAINTENANCE = 'MAINTENANCE',
  FINANCING = 'FINANCING',
}

export enum PayableStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
}

export enum DriverStatus {
  EM_ANALISE = 'EM_ANALISE',
  APROVADO = 'APROVADO',
  REPROVADO = 'REPROVADO',
}

export enum CnhCategory {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
}

export enum PixKeyType {
  CPF = 'CPF',
  CNPJ = 'CNPJ',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  RANDOM = 'RANDOM',
}

export enum DriverAuditAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
}

export enum TollStatus {
  PAID = 'PAID',
  UNPAID = 'UNPAID',
}

export enum DriverPaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
}

export enum DriverPaymentAuditAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  PAYMENT_EXECUTED = 'PAYMENT_EXECUTED',
  DELETED = 'DELETED',
}

export enum TruckType {
  TOCO = 'TOCO',
  TRUCK = 'TRUCK',
  CARRETA = 'CARRETA',
  BITREM = 'BITREM',
  VAN = 'VAN',
}

export enum TruckStatus {
  ATIVO = 'ATIVO',
  MANUTENCAO = 'MANUTENCAO',
  INATIVO = 'INATIVO',
}

export enum VehicleExpenseCategory {
  BORRACHARIA = 'BORRACHARIA',
  PEDAGIO = 'PEDAGIO',
  MANUTENCAO = 'MANUTENCAO',
  OUTROS = 'OUTROS',
}

export enum FreightExpenseType {
  PEDAGIO = 'PEDAGIO',
  COMBUSTIVEL = 'COMBUSTIVEL',
  DIARIA = 'DIARIA',
  MANUTENCAO = 'MANUTENCAO',
  COMISSAO = 'COMISSAO',
  OUTROS = 'OUTROS',
}

export enum FinancialTransactionType {
  RECEITA = 'RECEITA',
  DESPESA = 'DESPESA',
}

export enum InvoiceStatus {
  RASCUNHO = 'RASCUNHO',
  EMITIDA = 'EMITIDA',
}
