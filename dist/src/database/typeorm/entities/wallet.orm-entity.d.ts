import { UserOrmEntity } from '@database/typeorm/entities/user.orm-entity';
import { TransactionOrmEntity } from '@database/typeorm/entities/transaction.orm-entity';
import { PayableOrmEntity } from '@database/typeorm/entities/payable.orm-entity';
export declare class WalletOrmEntity {
    id: string;
    userId: string;
    user: UserOrmEntity;
    balance: string;
    lastSync: Date | null;
    createdAt: Date;
    updatedAt: Date;
    transactions: TransactionOrmEntity[];
    payables: PayableOrmEntity[];
}
