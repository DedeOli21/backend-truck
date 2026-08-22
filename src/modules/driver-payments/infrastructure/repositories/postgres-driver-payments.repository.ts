import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, Repository } from 'typeorm';
import {
  DriverOrmEntity,
  DriverPaymentOrmEntity,
  TruckOrmEntity,
} from '@database/typeorm/entities';
import { DriverPaymentStatus } from '@database/typeorm/entities/enums';
import { DriverPaymentEntity } from '@driver-payments/domain/entities/driver-payment.entity';
import {
  DriverPaymentContext,
  DriverPaymentFilters,
  DriverPaymentsRepository,
} from '@driver-payments/domain/repositories/driver-payments.repository';

@Injectable()
export class PostgresDriverPaymentsRepository implements DriverPaymentsRepository {
  constructor(
    @InjectRepository(DriverPaymentOrmEntity)
    private readonly repository: Repository<DriverPaymentOrmEntity>,
    @InjectRepository(DriverOrmEntity)
    private readonly driversRepository: Repository<DriverOrmEntity>,
    @InjectRepository(TruckOrmEntity)
    private readonly trucksRepository: Repository<TruckOrmEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async resolveDriverContext(
    driverId: string,
    ownerUserId?: string,
  ): Promise<DriverPaymentContext | null> {
    const driver = await this.driversRepository.findOne({
      where: ownerUserId ? { id: driverId, ownerUserId } : { id: driverId },
    });
    if (!driver) {
      return null;
    }

    // trucks.driver_id passou a referenciar drivers(id) na migration AddTruckDetails.
    let vehiclePlate: string | null = null;
    let rntrc: string | null = null;
    const truck = await this.trucksRepository.findOne({ where: { driverId: driver.id } });
    if (truck) {
      vehiclePlate = truck.plate;
      rntrc = truck.rntrc;
    }

    return {
      driverName: driver.fullName,
      pixKey: driver.pixKey,
      pixKeyType: driver.pixKeyType,
      vehiclePlate,
      rntrc,
    };
  }

  async create(payment: DriverPaymentEntity): Promise<DriverPaymentEntity> {
    await this.repository.save(this.repository.create(this.toOrm(payment)));
    return payment;
  }

  async findById(id: string, ownerUserId?: string): Promise<DriverPaymentEntity | null> {
    const row = await this.repository.findOne({
      where: ownerUserId ? { id, ownerUserId } : { id },
    });
    return row ? this.toDomain(row) : null;
  }

  async list(filters: DriverPaymentFilters): Promise<DriverPaymentEntity[]> {
    const qb = this.repository.createQueryBuilder('payment');

    if (filters.ownerUserId) {
      qb.andWhere('payment.owner_user_id = :ownerUserId', { ownerUserId: filters.ownerUserId });
    }

    if (filters.driverId) {
      qb.andWhere('payment.driver_id = :driverId', { driverId: filters.driverId });
    }
    if (filters.plate) {
      qb.andWhere('payment.vehicle_plate ILIKE :plate', { plate: `%${filters.plate}%` });
    }
    if (filters.client) {
      qb.andWhere('payment.client_name ILIKE :client', { client: `%${filters.client}%` });
    }
    if (filters.tollStatus) {
      qb.andWhere('payment.toll_status = :tollStatus', { tollStatus: filters.tollStatus });
    }
    if (filters.paymentStatus) {
      qb.andWhere('payment.payment_status = :paymentStatus', { paymentStatus: filters.paymentStatus });
    }

    const dateColumn = filters.dateField === 'delivery' ? 'payment.delivery_date' : 'payment.loading_date';
    if (filters.dateFrom) {
      qb.andWhere(`${dateColumn} >= :dateFrom`, { dateFrom: filters.dateFrom });
    }
    if (filters.dateTo) {
      qb.andWhere(`${dateColumn} <= :dateTo`, { dateTo: filters.dateTo });
    }

    qb.orderBy('payment.created_at', 'DESC');
    const rows = await qb.getMany();
    return rows.map((row) => this.toDomain(row));
  }

  async update(payment: DriverPaymentEntity): Promise<DriverPaymentEntity> {
    const fields = this.toOrm(payment);
    delete fields.id;
    delete fields.createdAt;
    fields.updatedAt = new Date();

    const result = await this.repository.update({ id: payment.id }, fields);
    if (!result.affected) {
      throw new NotFoundException('Pagamento nao encontrado');
    }
    return payment;
  }

  async markPaid(id: string, paidAt: Date): Promise<DriverPaymentEntity> {
    const result = await this.repository.update(
      { id },
      { paymentStatus: DriverPaymentStatus.PAID, paidAt, updatedAt: paidAt },
    );
    if (!result.affected) {
      throw new NotFoundException('Pagamento nao encontrado');
    }
    const row = await this.repository.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('Pagamento nao encontrado');
    }
    return this.toDomain(row);
  }

  async remove(id: string): Promise<void> {
    const result = await this.repository.delete({ id });
    if (!result.affected) {
      throw new NotFoundException('Pagamento nao encontrado');
    }
  }

  private toOrm(payment: DriverPaymentEntity): DeepPartial<DriverPaymentOrmEntity> {
    return {
      id: payment.id,
      driverId: payment.driverId,
      driverName: payment.driverName,
      vehiclePlate: payment.vehiclePlate,
      rntrc: payment.rntrc,
      pixKeyType: payment.pixKeyType,
      pixKey: payment.pixKey,
      baseAmount: payment.baseAmount.toFixed(2),
      inssAmount: payment.inssAmount.toFixed(2),
      sestSenatAmount: payment.sestSenatAmount.toFixed(2),
      tollAmount: payment.tollAmount.toFixed(2),
      totalAmount: payment.totalAmount.toFixed(2),
      tollStatus: payment.tollStatus,
      paymentStatus: payment.paymentStatus,
      paidAt: payment.paidAt,
      loadingDate: payment.loadingDate.toISOString().slice(0, 10),
      deliveryDate: payment.deliveryDate.toISOString().slice(0, 10),
      clientName: payment.clientName,
      createdByUserId: payment.createdByUserId,
      ownerUserId: payment.ownerUserId,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  private toDomain(row: DriverPaymentOrmEntity): DriverPaymentEntity {
    return new DriverPaymentEntity(
      row.id,
      row.driverId,
      row.driverName,
      row.vehiclePlate,
      row.rntrc,
      row.pixKeyType,
      row.pixKey,
      Number(row.baseAmount),
      Number(row.inssAmount),
      Number(row.sestSenatAmount),
      Number(row.tollAmount),
      Number(row.totalAmount),
      row.tollStatus,
      row.paymentStatus,
      row.paidAt,
      new Date(row.loadingDate),
      new Date(row.deliveryDate),
      row.clientName,
      row.createdByUserId,
      row.createdAt,
      row.updatedAt,
      row.ownerUserId,
    );
  }
}
