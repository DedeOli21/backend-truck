"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const entities_1 = require("../../database/typeorm/entities");
const user_wallet_provisioning_service_1 = require("../../database/typeorm/repositories/user-wallet-provisioning.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const transactions_service_1 = require("./application/services/transactions.service");
const in_memory_transactions_repository_1 = require("./infrastructure/repositories/in-memory-transactions.repository");
const postgres_transactions_repository_1 = require("./infrastructure/repositories/postgres-transactions.repository");
const transactions_repository_1 = require("./domain/repositories/transactions.repository");
const transactions_controller_1 = require("./presentation/controllers/transactions.controller");
const isTest = process.env.NODE_ENV === 'test';
let TransactionsModule = class TransactionsModule {
};
exports.TransactionsModule = TransactionsModule;
exports.TransactionsModule = TransactionsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            ...(isTest
                ? []
                : [typeorm_1.TypeOrmModule.forFeature([entities_1.UserOrmEntity, entities_1.WalletOrmEntity, entities_1.TransactionOrmEntity])]),
        ],
        controllers: [transactions_controller_1.TransactionsController],
        providers: [
            transactions_service_1.TransactionsService,
            jwt_auth_guard_1.JwtAuthGuard,
            roles_guard_1.RolesGuard,
            ...(isTest ? [] : [user_wallet_provisioning_service_1.UserWalletProvisioningService]),
            {
                provide: transactions_repository_1.TRANSACTIONS_REPOSITORY,
                useClass: isTest
                    ? in_memory_transactions_repository_1.InMemoryTransactionsRepository
                    : postgres_transactions_repository_1.PostgresTransactionsRepository,
            },
        ],
        exports: [transactions_service_1.TransactionsService],
    })
], TransactionsModule);
//# sourceMappingURL=transactions.module.js.map