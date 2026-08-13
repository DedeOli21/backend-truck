import { DriverAuditLogEntity } from '@drivers/domain/entities/driver-audit-log.entity';

export const DRIVER_AUDIT_LOG_REPOSITORY = 'DRIVER_AUDIT_LOG_REPOSITORY';

export interface DriverAuditLogRepository {
  log(entry: DriverAuditLogEntity): Promise<void>;
  listByDriver(driverId: string): Promise<DriverAuditLogEntity[]>;
}
