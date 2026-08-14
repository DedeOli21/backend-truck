import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DriverPaymentAuditLogOrmEntity } from '@database/typeorm/entities/driver-payment-audit-log.orm-entity';
import { DriverPaymentAuditLogEntity } from '@driver-payments/domain/entities/driver-payment-audit-log.entity';
import { DriverPaymentAuditLogRepository } from '@driver-payments/domain/repositories/driver-payments.repository';

@Injectable()
export class PostgresDriverPaymentAuditLogRepository implements DriverPaymentAuditLogRepository {
  constructor(
    @InjectRepository(DriverPaymentAuditLogOrmEntity)
    private readonly repository: Repository<DriverPaymentAuditLogOrmEntity>,
  ) {}

  async log(entity: DriverPaymentAuditLogEntity): Promise<void> {
    await this.repository.save(
      this.repository.create({
        id: entity.id,
        driverPaymentId: entity.driverPaymentId,
        action: entity.action,
        actorUserId: entity.actorUserId,
        payloadSnapshot: entity.payloadSnapshot,
      }),
    );
  }
}
