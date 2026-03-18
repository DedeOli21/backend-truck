"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryPayablesRepository = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
let InMemoryPayablesRepository = class InMemoryPayablesRepository {
    constructor() {
        this.store = new Map();
    }
    async findByUser(userId) {
        return this.store.get(userId) ?? [];
    }
    async saveMany(userId, items) {
        this.store.set(userId, items);
    }
    async update(userId, item) {
        const items = this.store.get(userId) ?? [];
        const index = items.findIndex((stored) => stored.id === item.id);
        if (index >= 0) {
            items[index] = item;
            this.store.set(userId, items);
        }
        return item;
    }
    async pay(userId, payableId) {
        const items = this.store.get(userId) ?? [];
        const target = items.find((item) => item.id === payableId);
        if (!target) {
            throw new common_1.NotFoundException('Boleto nao encontrado');
        }
        target.paid = true;
        target.paidAt = new Date();
        target.transactionId = (0, crypto_1.randomUUID)();
        return this.update(userId, target);
    }
};
exports.InMemoryPayablesRepository = InMemoryPayablesRepository;
exports.InMemoryPayablesRepository = InMemoryPayablesRepository = __decorate([
    (0, common_1.Injectable)()
], InMemoryPayablesRepository);
//# sourceMappingURL=in-memory-payables.repository.js.map