import { UserRole } from '@database/typeorm/entities/enums';
import { WalletOrmEntity } from '@database/typeorm/entities/wallet.orm-entity';
import { TruckOrmEntity } from '@database/typeorm/entities/truck.orm-entity';
import { OpenBankingSyncOrmEntity } from '@database/typeorm/entities/open-banking-sync.orm-entity';
export declare class UserOrmEntity {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
    wallets: WalletOrmEntity[];
    trucks: TruckOrmEntity[];
    openBankingSyncs: OpenBankingSyncOrmEntity[];
}
