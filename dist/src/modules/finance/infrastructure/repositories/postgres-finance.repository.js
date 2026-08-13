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
exports.PostgresFinanceRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const open_banking_sync_entity_1 = require("../../domain/entities/open-banking-sync.entity");
const open_banking_sync_orm_entity_1 = require("../../../../database/typeorm/entities/open-banking-sync.orm-entity");
const user_wallet_provisioning_service_1 = require("../../../../database/typeorm/repositories/user-wallet-provisioning.service");
const wallet_orm_entity_1 = require("../../../../database/typeorm/entities/wallet.orm-entity");
let PostgresFinanceRepository = class PostgresFinanceRepository {
    constructor(syncRepository, walletsRepository, provisioningService) {
        this.syncRepository = syncRepository;
        this.walletsRepository = walletsRepository;
        this.provisioningService = provisioningService;
    }
    async saveSync(sync) {
        const wallet = await this.provisioningService.ensureWalletForUser(sync.userId);
        const persisted = this.syncRepository.create({
            id: sync.id,
            userId: sync.userId,
            provider: sync.provider,
            availableBalance: sync.syncedAvailableBalance.toFixed(2),
            syncedAt: sync.syncedAt,
        });
        await this.syncRepository.save(persisted);
        await this.walletsRepository.update({ id: wallet.id }, { lastSync: sync.syncedAt });
        return sync;
    }
    async findLatestSyncByUser(userId) {
        const row = await this.syncRepository.findOne({
            where: { userId },
            order: { syncedAt: 'DESC' },
        });
        if (!row) {
            return null;
        }
        return new open_banking_sync_entity_1.OpenBankingSyncEntity(row.id, row.userId, row.provider, Number(row.availableBalance), row.syncedAt);
    }
};
exports.PostgresFinanceRepository = PostgresFinanceRepository;
exports.PostgresFinanceRepository = PostgresFinanceRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(open_banking_sync_orm_entity_1.OpenBankingSyncOrmEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(wallet_orm_entity_1.WalletOrmEntity)),
    __param(2, (0, common_1.Inject)(user_wallet_provisioning_service_1.UserWalletProvisioningService)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        user_wallet_provisioning_service_1.UserWalletProvisioningService])
], PostgresFinanceRepository);
//# sourceMappingURL=postgres-finance.repository.js.map