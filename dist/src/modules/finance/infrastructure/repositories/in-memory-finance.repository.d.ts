import { OpenBankingSyncEntity } from '@finance/domain/entities/open-banking-sync.entity';
import { FinanceRepository } from '@finance/domain/repositories/finance.repository';
export declare class InMemoryFinanceRepository implements FinanceRepository {
    private readonly syncByUser;
    saveSync(sync: OpenBankingSyncEntity): Promise<OpenBankingSyncEntity>;
    findLatestSyncByUser(userId: string): Promise<OpenBankingSyncEntity | null>;
}
