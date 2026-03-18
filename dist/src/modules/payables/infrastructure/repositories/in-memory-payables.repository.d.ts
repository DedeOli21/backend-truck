import { PayableEntity } from '@payables/domain/entities/payable.entity';
import { PayablesRepository } from '@payables/domain/repositories/payables.repository';
export declare class InMemoryPayablesRepository implements PayablesRepository {
    private readonly store;
    findByUser(userId: string): Promise<PayableEntity[]>;
    saveMany(userId: string, items: PayableEntity[]): Promise<void>;
    update(userId: string, item: PayableEntity): Promise<PayableEntity>;
    pay(userId: string, payableId: string): Promise<PayableEntity>;
}
