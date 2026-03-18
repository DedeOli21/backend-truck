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
exports.PayablesService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const payable_entity_1 = require("../../domain/entities/payable.entity");
const payables_repository_1 = require("../../domain/repositories/payables.repository");
let PayablesService = class PayablesService {
    constructor(repository) {
        this.repository = repository;
    }
    async listUrgentPayables(userId) {
        await this.ensureDefaults(userId);
        const items = await this.repository.findByUser(userId);
        return items.filter((item) => item.urgent && !item.paid);
    }
    async payPayable(userId, payableId) {
        await this.ensureDefaults(userId);
        return this.repository.pay(userId, payableId);
    }
    async ensureDefaults(userId) {
        const items = await this.repository.findByUser(userId);
        if (items.length > 0) {
            return;
        }
        const now = new Date();
        const defaults = [
            new payable_entity_1.PayableEntity((0, crypto_1.randomUUID)(), userId, 'MAINTENANCE', 'Manutencao de caminhao', 1200, new Date(now.getTime() + 86400000), true, false, null),
            new payable_entity_1.PayableEntity((0, crypto_1.randomUUID)(), userId, 'INSURANCE', 'Seguro veicular', 800, new Date(now.getTime() + 172800000), true, false, null),
            new payable_entity_1.PayableEntity((0, crypto_1.randomUUID)(), userId, 'FINANCING', 'Parcela de financiamento', 2000, new Date(now.getTime() + 259200000), true, false, null),
        ];
        await this.repository.saveMany(userId, defaults);
    }
};
exports.PayablesService = PayablesService;
exports.PayablesService = PayablesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(payables_repository_1.PAYABLES_REPOSITORY)),
    __metadata("design:paramtypes", [Object])
], PayablesService);
//# sourceMappingURL=payables.service.js.map