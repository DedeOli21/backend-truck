import { PayableCategoryDb, PayableStatus } from '@database/typeorm/entities/enums';
import { WalletOrmEntity } from '@database/typeorm/entities/wallet.orm-entity';
import { TransactionOrmEntity } from '@database/typeorm/entities/transaction.orm-entity';
export declare class PayableOrmEntity {
    id: string;
    walletId: string;
    wallet: WalletOrmEntity;
    title: string;
    category: PayableCategoryDb;
    amount: string;
    dueDate: string;
    status: PayableStatus;
    paidAt: Date | null;
    transactionId: string | null;
    transaction: TransactionOrmEntity | null;
    createdAt: Date;
    updatedAt: Date;
}
