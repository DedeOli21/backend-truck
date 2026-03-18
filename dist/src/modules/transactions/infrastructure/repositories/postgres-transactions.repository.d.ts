import { DataSource, Repository } from 'typeorm';
import { UserWalletProvisioningService } from '@database/typeorm/repositories/user-wallet-provisioning.service';
import { TransactionOrmEntity, WalletOrmEntity } from '@database/typeorm/entities';
import { TransactionEntity } from '@transactions/domain/entities/transaction.entity';
import { TransactionsRepository } from '@transactions/domain/repositories/transactions.repository';
export declare class PostgresTransactionsRepository implements TransactionsRepository {
    private readonly transactionsRepository;
    private readonly walletsRepository;
    private readonly dataSource;
    private readonly provisioningService;
    constructor(transactionsRepository: Repository<TransactionOrmEntity>, walletsRepository: Repository<WalletOrmEntity>, dataSource: DataSource, provisioningService: UserWalletProvisioningService);
    create(transaction: TransactionEntity): Promise<TransactionEntity>;
    findByUser(userId: string): Promise<TransactionEntity[]>;
}
