import { Injectable } from '@nestjs/common';
import { DriverAuditLogEntity } from '@drivers/domain/entities/driver-audit-log.entity';
import { DriverAuditLogRepository } from '@drivers/domain/repositories/driver-audit-log.repository';

@Injectable()
export class InMemoryDriverAuditLogRepository implements DriverAuditLogRepository {
  private readonly entries: DriverAuditLogEntity[] = [];

  async log(entry: DriverAuditLogEntity): Promise<void> {
    this.entries.push(entry);
  }

  async listByDriver(driverId: string): Promise<DriverAuditLogEntity[]> {
    return this.entries.filter((entry) => entry.driverId === driverId);
  }
}
