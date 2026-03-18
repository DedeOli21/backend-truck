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
exports.TransactionsService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const transaction_entity_1 = require("../../domain/entities/transaction.entity");
const transactions_repository_1 = require("../../domain/repositories/transactions.repository");
let TransactionsService = class TransactionsService {
    constructor(repository) {
        this.repository = repository;
    }
    async createFreight(userId, payload) {
        const transaction = new transaction_entity_1.TransactionEntity((0, crypto_1.randomUUID)(), userId, 'FREIGHT', payload.amount, payload.description, new Date());
        return this.repository.create(transaction);
    }
    async createFuel(userId, payload) {
        const currentBalance = await this.getBalance(userId);
        if (payload.amount > currentBalance) {
            throw new common_1.BadRequestException('Saldo insuficiente para abastecimento');
        }
        const transaction = new transaction_entity_1.TransactionEntity((0, crypto_1.randomUUID)(), userId, 'FUEL', payload.amount, payload.description, new Date());
        return this.repository.create(transaction);
    }
    async listByUser(userId) {
        return this.repository.findByUser(userId);
    }
    async getBalance(userId) {
        const transactions = await this.repository.findByUser(userId);
        return transactions.reduce((acc, transaction) => {
            return transaction.type === 'FREIGHT'
                ? acc + transaction.amount
                : acc - transaction.amount;
        }, 0);
    }
};
exports.TransactionsService = TransactionsService;
exports.TransactionsService = TransactionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(transactions_repository_1.TRANSACTIONS_REPOSITORY)),
    __metadata("design:paramtypes", [Object])
], TransactionsService);
//# sourceMappingURL=transactions.service.js.map