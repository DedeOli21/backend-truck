import { PayableEntity } from '@payables/domain/entities/payable.entity';

export const PAYABLES_REPOSITORY = 'PAYABLES_REPOSITORY';

export interface PayablesRepository {
  findByUser(userId: string): Promise<PayableEntity[]>;
  saveMany(userId: string, items: PayableEntity[]): Promise<void>;
  update(userId: string, item: PayableEntity): Promise<PayableEntity>;
  pay(userId: string, payableId: string): Promise<PayableEntity>;
}





