"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryTransactionsRepository = void 0;
const common_1 = require("@nestjs/common");
let InMemoryTransactionsRepository = class InMemoryTransactionsRepository {
    constructor() {
        this.store = new Map();
    }
    async create(transaction) {
        const transactions = this.store.get(transaction.userId) ?? [];
        transactions.push(transaction);
        this.store.set(transaction.userId, transactions);
        return transaction;
    }
    async findByUser(userId) {
        return this.store.get(userId) ?? [];
    }
};
exports.InMemoryTransactionsRepository = InMemoryTransactionsRepository;
exports.InMemoryTransactionsRepository = InMemoryTransactionsRepository = __decorate([
    (0, common_1.Injectable)()
], InMemoryTransactionsRepository);
//# sourceMappingURL=in-memory-transactions.repository.js.map