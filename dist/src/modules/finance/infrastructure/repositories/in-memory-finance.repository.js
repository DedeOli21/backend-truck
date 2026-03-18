"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryFinanceRepository = void 0;
const common_1 = require("@nestjs/common");
let InMemoryFinanceRepository = class InMemoryFinanceRepository {
    constructor() {
        this.syncByUser = new Map();
    }
    async saveSync(sync) {
        this.syncByUser.set(sync.userId, sync);
        return sync;
    }
    async findLatestSyncByUser(userId) {
        return this.syncByUser.get(userId) ?? null;
    }
};
exports.InMemoryFinanceRepository = InMemoryFinanceRepository;
exports.InMemoryFinanceRepository = InMemoryFinanceRepository = __decorate([
    (0, common_1.Injectable)()
], InMemoryFinanceRepository);
//# sourceMappingURL=in-memory-finance.repository.js.map