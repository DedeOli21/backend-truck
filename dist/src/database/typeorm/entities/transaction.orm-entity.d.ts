import { TransactionCategory, TransactionDirection } from '@database/typeorm/entities/enums';
import { WalletOrmEntity } from '@database/typeorm/entities/wallet.orm-entity';
import { TruckOrmEntity } from '@database/typeorm/entities/truck.orm-entity';
export declare class TransactionOrmEntity {
    id: string;
    walletId: string;
    wallet: WalletOrmEntity;
    truckId: string | null;
    truck: TruckOrmEntity | null;
    direction: TransactionDirection;
    category: TransactionCategory;
    amount: string;
    description: string;
    transactionDate: Date;
    createdAt: Date;
}
