import { Inject, Injectable } from '@nestjs/common';
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
    const items = await this.repository.findByUser(userId);
    return items.filter((item) => item.urgent && !item.paid);
  }

  async payPayable(userId: string, payableId: string): Promise<PayableEntity> {
    return this.repository.pay(userId, payableId);
  }

}





