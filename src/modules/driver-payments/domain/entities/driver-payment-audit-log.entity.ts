import { DriverPaymentAuditAction } from '@database/typeorm/entities/enums';

export class DriverPaymentAuditLogEntity {
  constructor(
    public readonly id: string,
    public readonly driverPaymentId: string,
    public readonly action: DriverPaymentAuditAction,
    public readonly actorUserId: string,
    public readonly payloadSnapshot: Record<string, unknown>,
    public readonly createdAt: Date,
  ) {}
}
