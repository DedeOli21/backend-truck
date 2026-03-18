import { UserOrmEntity } from '@database/typeorm/entities/user.orm-entity';
export declare class OpenBankingSyncOrmEntity {
    id: string;
    userId: string;
    user: UserOrmEntity;
    provider: string;
    availableBalance: string;
    syncedAt: Date;
    createdAt: Date;
}
