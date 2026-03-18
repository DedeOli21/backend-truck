import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PayableEntity } from '@payables/domain/entities/payable.entity';
import {
  PAYABLES_REPOSITORY,
  PayablesRepository,
} from '@payables/domain/repositories/payables.repository';

@Injectable()
export class PayablesService {
  constructor(
    @Inject(PAYABLES_REPOSITORY)
    private readonly repository: PayablesRepository,
  ) {}

  async listUrgentPayables(userId: string): Promise<PayableEntity[]> {
    await this.ensureDefaults(userId);
    const items = await this.repository.findByUser(userId);
    return items.filter((item) => item.urgent && !item.paid);
  }

  async payPayable(userId: string, payableId: string): Promise<PayableEntity> {
    await this.ensureDefaults(userId);
    return this.repository.pay(userId, payableId);
  }

  private async ensureDefaults(userId: string): Promise<void> {
    const items = await this.repository.findByUser(userId);
    if (items.length > 0) {
      return;
    }

    const now = new Date();
    const defaults: PayableEntity[] = [
      new PayableEntity(
        randomUUID(),
        userId,
        'MAINTENANCE',
        'Manutencao de caminhao',
        1200,
        new Date(now.getTime() + 86400000),
        true,
        false,
        null,
      ),
      new PayableEntity(
        randomUUID(),
        userId,
        'INSURANCE',
        'Seguro veicular',
        800,
        new Date(now.getTime() + 172800000),
        true,
        false,
        null,
      ),
      new PayableEntity(
        randomUUID(),
        userId,
        'FINANCING',
        'Parcela de financiamento',
        2000,
        new Date(now.getTime() + 259200000),
        true,
        false,
        null,
      ),
    ];

    await this.repository.saveMany(userId, defaults);
  }
}





