import { PayableEntity } from '@payables/domain/entities/payable.entity';
import { PayablesRepository } from '@payables/domain/repositories/payables.repository';
export declare class PayablesService {
    private readonly repository;
    constructor(repository: PayablesRepository);
    listUrgentPayables(userId: string): Promise<PayableEntity[]>;
    payPayable(userId: string, payableId: string): Promise<PayableEntity>;
    private ensureDefaults;
}
