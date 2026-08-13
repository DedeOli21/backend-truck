import { DriverAuditAction } from '@database/typeorm/entities/enums';

export class DriverAuditLogEntity {
  constructor(
    public readonly id: string,
    public readonly driverId: string,
    public readonly action: DriverAuditAction,
    public readonly actorUserId: string,
    public readonly payloadSnapshot: Record<string, unknown>,
    public readonly createdAt: Date,
  ) {}
}
