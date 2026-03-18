import { Repository } from 'typeorm';
import { OpenBankingSyncEntity } from '@finance/domain/entities/open-banking-sync.entity';
import { FinanceRepository } from '@finance/domain/repositories/finance.repository';
import { OpenBankingSyncOrmEntity } from '@database/typeorm/entities/open-banking-sync.orm-entity';
import { UserWalletProvisioningService } from '@database/typeorm/repositories/user-wallet-provisioning.service';
import { WalletOrmEntity } from '@database/typeorm/entities/wallet.orm-entity';
export declare class PostgresFinanceRepository implements FinanceRepository {
    private readonly syncRepository;
    private readonly walletsRepository;
    private readonly provisioningService;
    constructor(syncRepository: Repository<OpenBankingSyncOrmEntity>, walletsRepository: Repository<WalletOrmEntity>, provisioningService: UserWalletProvisioningService);
    saveSync(sync: OpenBankingSyncEntity): Promise<OpenBankingSyncEntity>;
    findLatestSyncByUser(userId: string): Promise<OpenBankingSyncEntity | null>;
}
