import { UserOrmEntity } from '@database/typeorm/entities/user.orm-entity';
import { TransactionOrmEntity } from '@database/typeorm/entities/transaction.orm-entity';
export declare class TruckOrmEntity {
    id: string;
    plate: string;
    brandModel: string;
    year: number | null;
    driverId: string | null;
    driver: UserOrmEntity | null;
    createdAt: Date;
    updatedAt: Date;
    transactions: TransactionOrmEntity[];
}
