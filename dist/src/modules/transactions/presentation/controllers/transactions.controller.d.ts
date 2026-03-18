import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { TransactionsService } from '@applications/transactions/application/services/transactions.service';
import { CreateFreightDto } from '@transactions/presentation/dtos/create-freight.dto';
import { CreateFuelDto } from '@transactions/presentation/dtos/create-fuel.dto';
export declare class TransactionsController {
    private readonly transactionsService;
    constructor(transactionsService: TransactionsService);
    list(req: AuthenticatedRequest): Promise<import("../../domain/entities/transaction.entity").TransactionEntity[]>;
    createFreight(req: AuthenticatedRequest, dto: CreateFreightDto): Promise<import("../../domain/entities/transaction.entity").TransactionEntity>;
    createFuel(req: AuthenticatedRequest, dto: CreateFuelDto): Promise<import("../../domain/entities/transaction.entity").TransactionEntity>;
}
