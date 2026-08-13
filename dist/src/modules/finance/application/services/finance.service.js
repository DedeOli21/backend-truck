"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const transactions_service_1 = require("../../../transactions/application/services/transactions.service");
const open_banking_sync_entity_1 = require("../../domain/entities/open-banking-sync.entity");
const finance_repository_1 = require("../../domain/repositories/finance.repository");
let FinanceService = class FinanceService {
    constructor(financeRepository, transactionsService) {
        this.financeRepository = financeRepository;
        this.transactionsService = transactionsService;
    }
    async getBalance(userId) {
        const walletBalance = await this.transactionsService.getBalance(userId);
        const latestSync = await this.financeRepository.findLatestSyncByUser(userId);
        const openBankingBalance = latestSync?.syncedAvailableBalance ?? 0;
        return {
            walletBalance,
            openBankingBalance,
            totalAvailable: walletBalance + openBankingBalance,
        };
    }
    async syncOpenBanking(userId, payload) {
        const sync = new open_banking_sync_entity_1.OpenBankingSyncEntity((0, crypto_1.randomUUID)(), userId, payload.provider, payload.availableBalance, new Date());
        return this.financeRepository.saveSync(sync);
    }
};
exports.FinanceService = FinanceService;
exports.FinanceService = FinanceService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(finance_repository_1.FINANCE_REPOSITORY)),
    __param(1, (0, common_1.Inject)(transactions_service_1.TransactionsService)),
    __metadata("design:paramtypes", [Object, transactions_service_1.TransactionsService])
], FinanceService);
//# sourceMappingURL=finance.service.js.map