import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TransactionsService } from '@transactions/application/services/transactions.service';
import { OpenBankingSyncEntity } from '@finance/domain/entities/open-banking-sync.entity';
import {
  FINANCE_REPOSITORY,
  FinanceRepository,
} from '@finance/domain/repositories/finance.repository';
import { SyncOpenBankingDto } from '@finance/presentation/dtos/sync-open-banking.dto';

@Injectable()
export class FinanceService {
  constructor(
    @Inject(FINANCE_REPOSITORY)
    private readonly financeRepository: FinanceRepository,
    @Inject(TransactionsService)
    private readonly transactionsService: TransactionsService,
  ) {}

  async getBalance(userId: string) {
    const walletBalance = await this.transactionsService.getBalance(userId);
    const latestSync = await this.financeRepository.findLatestSyncByUser(userId);
    const openBankingBalance = latestSync?.syncedAvailableBalance ?? 0;

    return {
      walletBalance,
      openBankingBalance,
      totalAvailable: walletBalance + openBankingBalance,
    };
  }

  async syncOpenBanking(userId: string, payload: SyncOpenBankingDto) {
    const sync = new OpenBankingSyncEntity(
      randomUUID(),
      userId,
      payload.provider,
      payload.availableBalance,
      new Date(),
    );

    return this.financeRepository.saveSync(sync);
  }
}





