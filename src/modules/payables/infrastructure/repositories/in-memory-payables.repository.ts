import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PayableEntity } from '@payables/domain/entities/payable.entity';
import { PayablesRepository } from '@payables/domain/repositories/payables.repository';

@Injectable()
export class InMemoryPayablesRepository implements PayablesRepository {
  private readonly store = new Map<string, PayableEntity[]>();

  async findByUser(userId: string): Promise<PayableEntity[]> {
    return this.store.get(userId) ?? [];
  }

  async saveMany(userId: string, items: PayableEntity[]): Promise<void> {
    this.store.set(userId, items);
  }

  async update(userId: string, item: PayableEntity): Promise<PayableEntity> {
    const items = this.store.get(userId) ?? [];
    const index = items.findIndex((stored) => stored.id === item.id);
    if (index >= 0) {
      items[index] = item;
      this.store.set(userId, items);
    }
    return item;
  }

  async pay(userId: string, payableId: string): Promise<PayableEntity> {
    const items = this.store.get(userId) ?? [];
    const target = items.find((item) => item.id === payableId);

    if (!target) {
      throw new NotFoundException('Boleto nao encontrado');
    }

    target.paid = true;
    target.paidAt = new Date();
    target.transactionId = randomUUID();

    return this.update(userId, target);
  }
}





