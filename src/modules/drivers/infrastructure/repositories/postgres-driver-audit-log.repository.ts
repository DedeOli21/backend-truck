import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DriverAuditLogOrmEntity } from '@database/typeorm/entities/driver-audit-log.orm-entity';
import { DriverAuditLogEntity } from '@drivers/domain/entities/driver-audit-log.entity';
import { DriverAuditLogRepository } from '@drivers/domain/repositories/driver-audit-log.repository';

@Injectable()
export class PostgresDriverAuditLogRepository implements DriverAuditLogRepository {
  constructor(
    @InjectRepository(DriverAuditLogOrmEntity)
    private readonly repository: Repository<DriverAuditLogOrmEntity>,
  ) {}

  async log(entry: DriverAuditLogEntity): Promise<void> {
    await this.repository.save(
      this.repository.create({
        id: entry.id,
        driverId: entry.driverId,
        action: entry.action,
        actorUserId: entry.actorUserId,
        payloadSnapshot: entry.payloadSnapshot,
      }),
    );
  }

  async listByDriver(driverId: string): Promise<DriverAuditLogEntity[]> {
    const rows = await this.repository.find({ where: { driverId }, order: { createdAt: 'DESC' } });
    return rows.map(
      (row) =>
        new DriverAuditLogEntity(row.id, row.driverId, row.action, row.actorUserId, row.payloadSnapshot, row.createdAt),
    );
  }
}
