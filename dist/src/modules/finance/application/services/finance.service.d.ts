import { TransactionsService } from '@transactions/application/services/transactions.service';
import { OpenBankingSyncEntity } from '@finance/domain/entities/open-banking-sync.entity';
import { FinanceRepository } from '@finance/domain/repositories/finance.repository';
import { SyncOpenBankingDto } from '@finance/presentation/dtos/sync-open-banking.dto';
export declare class FinanceService {
    private readonly financeRepository;
    private readonly transactionsService;
    constructor(financeRepository: FinanceRepository, transactionsService: TransactionsService);
    getBalance(userId: string): Promise<{
        walletBalance: number;
        openBankingBalance: number;
        totalAvailable: number;
    }>;
    syncOpenBanking(userId: string, payload: SyncOpenBankingDto): Promise<OpenBankingSyncEntity>;
}
