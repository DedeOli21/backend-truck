import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OpenBankingSyncEntity } from '@finance/domain/entities/open-banking-sync.entity';
import { FinanceRepository } from '@finance/domain/repositories/finance.repository';
import { OpenBankingSyncOrmEntity } from '@database/typeorm/entities/open-banking-sync.orm-entity';
import { UserWalletProvisioningService } from '@database/typeorm/repositories/user-wallet-provisioning.service';
import { WalletOrmEntity } from '@database/typeorm/entities/wallet.orm-entity';

@Injectable()
export class PostgresFinanceRepository implements FinanceRepository {
  constructor(
    @InjectRepository(OpenBankingSyncOrmEntity)
    private readonly syncRepository: Repository<OpenBankingSyncOrmEntity>,
    @InjectRepository(WalletOrmEntity)
    private readonly walletsRepository: Repository<WalletOrmEntity>,
    @Inject(UserWalletProvisioningService)
    private readonly provisioningService: UserWalletProvisioningService,
  ) {}

  async saveSync(sync: OpenBankingSyncEntity): Promise<OpenBankingSyncEntity> {
    const wallet = await this.provisioningService.ensureWalletForUser(sync.userId);

    const persisted = this.syncRepository.create({
      id: sync.id,
      userId: sync.userId,
      provider: sync.provider,
      availableBalance: sync.syncedAvailableBalance.toFixed(2),
      syncedAt: sync.syncedAt,
    });

    await this.syncRepository.save(persisted);

    await this.walletsRepository.update(
      { id: wallet.id },
      { lastSync: sync.syncedAt },
    );

    return sync;
  }

  async findLatestSyncByUser(userId: string): Promise<OpenBankingSyncEntity | null> {
    const row = await this.syncRepository.findOne({
      where: { userId },
      order: { syncedAt: 'DESC' },
    });

    if (!row) {
      return null;
    }

    return new OpenBankingSyncEntity(
      row.id,
      row.userId,
      row.provider,
      Number(row.availableBalance),
      row.syncedAt,
    );
  }
}





