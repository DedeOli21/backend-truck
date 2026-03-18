import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { PayablesService } from '@applications/payables/application/services/payables.service';
export declare class PayablesController {
    private readonly payablesService;
    constructor(payablesService: PayablesService);
    list(req: AuthenticatedRequest): Promise<import("../../domain/entities/payable.entity").PayableEntity[]>;
    pay(req: AuthenticatedRequest, id: string): Promise<import("../../domain/entities/payable.entity").PayableEntity>;
}
