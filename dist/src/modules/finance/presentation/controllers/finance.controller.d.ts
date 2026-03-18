import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { FinanceService } from '@applications/finance/application/services/finance.service';
import { SyncOpenBankingDto } from '@finance/presentation/dtos/sync-open-banking.dto';
export declare class FinanceController {
    private readonly financeService;
    constructor(financeService: FinanceService);
    getBalance(req: AuthenticatedRequest): Promise<{
        walletBalance: number;
        openBankingBalance: number;
        totalAvailable: number;
    }>;
    syncOpenBanking(req: AuthenticatedRequest, dto: SyncOpenBankingDto): Promise<import("../../domain/entities/open-banking-sync.entity").OpenBankingSyncEntity>;
}
