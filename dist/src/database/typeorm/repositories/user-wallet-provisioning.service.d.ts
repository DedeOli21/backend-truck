import { Repository } from 'typeorm';
import { UserOrmEntity } from '@database/typeorm/entities/user.orm-entity';
import { WalletOrmEntity } from '@database/typeorm/entities/wallet.orm-entity';
export declare class UserWalletProvisioningService {
    private readonly usersRepository;
    private readonly walletsRepository;
    constructor(usersRepository: Repository<UserOrmEntity>, walletsRepository: Repository<WalletOrmEntity>);
    ensureWalletForUser(userId: string): Promise<WalletOrmEntity>;
}
