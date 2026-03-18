import { Injectable } from '@nestjs/common';
import { OpenBankingSyncEntity } from '@finance/domain/entities/open-banking-sync.entity';
import { FinanceRepository } from '@finance/domain/repositories/finance.repository';

@Injectable()
export class InMemoryFinanceRepository implements FinanceRepository {
  private readonly syncByUser = new Map<string, OpenBankingSyncEntity>();

  async saveSync(sync: OpenBankingSyncEntity): Promise<OpenBankingSyncEntity> {
    this.syncByUser.set(sync.userId, sync);
    return sync;
  }

  async findLatestSyncByUser(userId: string): Promise<OpenBankingSyncEntity | null> {
    return this.syncByUser.get(userId) ?? null;
  }
}





