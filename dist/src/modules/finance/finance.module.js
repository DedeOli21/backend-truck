"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const entities_1 = require("../../database/typeorm/entities");
const user_wallet_provisioning_service_1 = require("../../database/typeorm/repositories/user-wallet-provisioning.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const transactions_module_1 = require("../transactions/transactions.module");
const finance_service_1 = require("./application/services/finance.service");
const finance_repository_1 = require("./domain/repositories/finance.repository");
const in_memory_finance_repository_1 = require("./infrastructure/repositories/in-memory-finance.repository");
const postgres_finance_repository_1 = require("./infrastructure/repositories/postgres-finance.repository");
const finance_controller_1 = require("./presentation/controllers/finance.controller");
const isTest = process.env.NODE_ENV === 'test';
let FinanceModule = class FinanceModule {
};
exports.FinanceModule = FinanceModule;
exports.FinanceModule = FinanceModule = __decorate([
    (0, common_1.Module)({
        imports: [
            transactions_module_1.TransactionsModule,
            ...(isTest
                ? []
                : [typeorm_1.TypeOrmModule.forFeature([entities_1.UserOrmEntity, entities_1.WalletOrmEntity, entities_1.OpenBankingSyncOrmEntity])]),
        ],
        controllers: [finance_controller_1.FinanceController],
        providers: [
            finance_service_1.FinanceService,
            jwt_auth_guard_1.JwtAuthGuard,
            roles_guard_1.RolesGuard,
            ...(isTest ? [] : [user_wallet_provisioning_service_1.UserWalletProvisioningService]),
            {
                provide: finance_repository_1.FINANCE_REPOSITORY,
                useClass: isTest ? in_memory_finance_repository_1.InMemoryFinanceRepository : postgres_finance_repository_1.PostgresFinanceRepository,
            },
        ],
        exports: [finance_service_1.FinanceService],
    })
], FinanceModule);
//# sourceMappingURL=finance.module.js.map