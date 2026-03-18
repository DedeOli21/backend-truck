import { TransactionEntity } from '@transactions/domain/entities/transaction.entity';
import { TransactionsRepository } from '@transactions/domain/repositories/transactions.repository';
import { CreateFreightDto } from '@transactions/presentation/dtos/create-freight.dto';
import { CreateFuelDto } from '@transactions/presentation/dtos/create-fuel.dto';
export declare class TransactionsService {
    private readonly repository;
    constructor(repository: TransactionsRepository);
    createFreight(userId: string, payload: CreateFreightDto): Promise<TransactionEntity>;
    createFuel(userId: string, payload: CreateFuelDto): Promise<TransactionEntity>;
    listByUser(userId: string): Promise<TransactionEntity[]>;
    getBalance(userId: string): Promise<number>;
}
