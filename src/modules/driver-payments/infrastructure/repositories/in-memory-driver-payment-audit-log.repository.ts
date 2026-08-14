import { Injectable } from '@nestjs/common';
import { DriverPaymentAuditLogEntity } from '@driver-payments/domain/entities/driver-payment-audit-log.entity';
import { DriverPaymentAuditLogRepository } from '@driver-payments/domain/repositories/driver-payments.repository';

@Injectable()
export class InMemoryDriverPaymentAuditLogRepository implements DriverPaymentAuditLogRepository {
  private readonly store: DriverPaymentAuditLogEntity[] = [];

  async log(entity: DriverPaymentAuditLogEntity): Promise<void> {
    this.store.push(entity);
  }

  findAll(): DriverPaymentAuditLogEntity[] {
    return [...this.store];
  }
}
