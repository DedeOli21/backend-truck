import { Injectable, NotFoundException } from '@nestjs/common';
import { DriverPaymentStatus } from '@database/typeorm/entities/enums';
import { DriverPaymentEntity } from '@driver-payments/domain/entities/driver-payment.entity';
import {
  DriverPaymentContext,
  DriverPaymentFilters,
  DriverPaymentsRepository,
} from '@driver-payments/domain/repositories/driver-payments.repository';

@Injectable()
export class InMemoryDriverPaymentsRepository implements DriverPaymentsRepository {
  private readonly store = new Map<string, DriverPaymentEntity>();
  private readonly contexts = new Map<string, DriverPaymentContext>();

  seedContext(driverId: string, context: DriverPaymentContext): void {
    this.contexts.set(driverId, context);
  }

  async resolveDriverContext(driverId: string): Promise<DriverPaymentContext | null> {
    return this.contexts.get(driverId) ?? null;
  }

  async create(payment: DriverPaymentEntity): Promise<DriverPaymentEntity> {
    this.store.set(payment.id, payment);
    return payment;
  }

  async findById(id: string, ownerUserId?: string): Promise<DriverPaymentEntity | null> {
    const payment = this.store.get(id);
    return payment && (!ownerUserId || payment.ownerUserId === ownerUserId) ? payment : null;
  }

  async list(filters: DriverPaymentFilters): Promise<DriverPaymentEntity[]> {
    const dateField = filters.dateField === 'delivery' ? 'deliveryDate' : 'loadingDate';

    return [...this.store.values()]
      .filter((payment) => {
        if (filters.ownerUserId && payment.ownerUserId !== filters.ownerUserId) {
          return false;
        }
        if (filters.driverId && payment.driverId !== filters.driverId) {
          return false;
        }
        if (filters.plate && !(payment.vehiclePlate ?? '').toLowerCase().includes(filters.plate.toLowerCase())) {
          return false;
        }
        if (filters.client && !payment.clientName.toLowerCase().includes(filters.client.toLowerCase())) {
          return false;
        }
        if (filters.tollStatus && payment.tollStatus !== filters.tollStatus) {
          return false;
        }
        if (filters.paymentStatus && payment.paymentStatus !== filters.paymentStatus) {
          return false;
        }
        if (filters.dateFrom && payment[dateField].getTime() < new Date(filters.dateFrom).getTime()) {
          return false;
        }
        if (filters.dateTo && payment[dateField].getTime() > new Date(`${filters.dateTo}T23:59:59`).getTime()) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async update(payment: DriverPaymentEntity): Promise<DriverPaymentEntity> {
    if (!this.store.has(payment.id)) {
      throw new NotFoundException('Pagamento nao encontrado');
    }
    this.store.set(payment.id, payment);
    return payment;
  }

  async markPaid(id: string, paidAt: Date): Promise<DriverPaymentEntity> {
    const existing = this.store.get(id);
    if (!existing) {
      throw new NotFoundException('Pagamento nao encontrado');
    }
    existing.paymentStatus = DriverPaymentStatus.PAID;
    existing.paidAt = paidAt;
    existing.updatedAt = paidAt;
    return existing;
  }

  async remove(id: string): Promise<void> {
    if (!this.store.delete(id)) {
      throw new NotFoundException('Pagamento nao encontrado');
    }
  }
}
