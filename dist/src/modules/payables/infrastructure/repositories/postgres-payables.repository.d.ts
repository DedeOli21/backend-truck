import { DataSource, Repository } from 'typeorm';
import { PayableOrmEntity, WalletOrmEntity } from '@database/typeorm/entities';
import { UserWalletProvisioningService } from '@database/typeorm/repositories/user-wallet-provisioning.service';
import { PayableEntity } from '@payables/domain/entities/payable.entity';
import { PayablesRepository } from '@payables/domain/repositories/payables.repository';
export declare class PostgresPayablesRepository implements PayablesRepository {
    private readonly payablesRepository;
    private readonly walletsRepository;
    private readonly dataSource;
    private readonly provisioningService;
    constructor(payablesRepository: Repository<PayableOrmEntity>, walletsRepository: Repository<WalletOrmEntity>, dataSource: DataSource, provisioningService: UserWalletProvisioningService);
    findByUser(userId: string): Promise<PayableEntity[]>;
    saveMany(userId: string, items: PayableEntity[]): Promise<void>;
    update(userId: string, item: PayableEntity): Promise<PayableEntity>;
    pay(userId: string, payableId: string): Promise<PayableEntity>;
    private toDomain;
}
