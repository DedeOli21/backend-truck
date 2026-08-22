import {
  DriverPaymentStatus,
  PixKeyType,
  TollStatus,
} from '@database/typeorm/entities/enums';
import { DriverPaymentAuditLogEntity } from '@driver-payments/domain/entities/driver-payment-audit-log.entity';
import { DriverPaymentEntity } from '@driver-payments/domain/entities/driver-payment.entity';

export const DRIVER_PAYMENTS_REPOSITORY = 'DRIVER_PAYMENTS_REPOSITORY';
export const DRIVER_PAYMENT_AUDIT_LOG_REPOSITORY = 'DRIVER_PAYMENT_AUDIT_LOG_REPOSITORY';

export interface DriverPaymentContext {
  driverName: string;
  pixKey: string;
  pixKeyType: PixKeyType;
  vehiclePlate: string | null;
  rntrc: string | null;
}

export interface DriverPaymentFilters {
  /** Gestor dono dos pagamentos. Obrigatório: ninguém lista fora do próprio escopo. */
  ownerUserId?: string;
  driverId?: string;
  plate?: string;
  client?: string;
  tollStatus?: TollStatus;
  paymentStatus?: DriverPaymentStatus;
  dateFrom?: string;
  dateTo?: string;
  dateField?: 'loading' | 'delivery';
}

export interface DriverPaymentsRepository {
  resolveDriverContext(driverId: string, ownerUserId?: string): Promise<DriverPaymentContext | null>;
  create(payment: DriverPaymentEntity): Promise<DriverPaymentEntity>;
  findById(id: string, ownerUserId?: string): Promise<DriverPaymentEntity | null>;
  list(filters: DriverPaymentFilters): Promise<DriverPaymentEntity[]>;
  update(payment: DriverPaymentEntity): Promise<DriverPaymentEntity>;
  markPaid(id: string, paidAt: Date): Promise<DriverPaymentEntity>;
  remove(id: string): Promise<void>;
}

export interface DriverPaymentAuditLogRepository {
  log(entity: DriverPaymentAuditLogEntity): Promise<void>;
}
