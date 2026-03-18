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
exports.UserWalletProvisioningService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const crypto_1 = require("crypto");
const typeorm_2 = require("typeorm");
const enums_1 = require("../entities/enums");
const user_orm_entity_1 = require("../entities/user.orm-entity");
const wallet_orm_entity_1 = require("../entities/wallet.orm-entity");
let UserWalletProvisioningService = class UserWalletProvisioningService {
    constructor(usersRepository, walletsRepository) {
        this.usersRepository = usersRepository;
        this.walletsRepository = walletsRepository;
    }
    async ensureWalletForUser(userId) {
        let user = await this.usersRepository.findOne({ where: { id: userId } });
        if (!user) {
            user = this.usersRepository.create({
                id: userId,
                name: `Driver ${userId.slice(0, 8)}`,
                email: `${userId}@local.driver`,
                passwordHash: 'temporary-hash',
                role: enums_1.UserRole.DRIVER,
            });
            await this.usersRepository.save(user);
        }
        let wallet = await this.walletsRepository.findOne({ where: { userId } });
        if (!wallet) {
            wallet = this.walletsRepository.create({
                id: (0, crypto_1.randomUUID)(),
                userId,
                balance: '0',
                lastSync: null,
            });
            await this.walletsRepository.save(wallet);
        }
        return wallet;
    }
};
exports.UserWalletProvisioningService = UserWalletProvisioningService;
exports.UserWalletProvisioningService = UserWalletProvisioningService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_orm_entity_1.UserOrmEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(wallet_orm_entity_1.WalletOrmEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], UserWalletProvisioningService);
//# sourceMappingURL=user-wallet-provisioning.service.js.map