import { OpenBankingSyncEntity } from '@finance/domain/entities/open-banking-sync.entity';
export declare const FINANCE_REPOSITORY = "FINANCE_REPOSITORY";
export interface FinanceRepository {
    saveSync(sync: OpenBankingSyncEntity): Promise<OpenBankingSyncEntity>;
    findLatestSyncByUser(userId: string): Promise<OpenBankingSyncEntity | null>;
}
