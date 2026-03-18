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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserOrmEntity = void 0;
const typeorm_1 = require("typeorm");
const enums_1 = require("./enums");
const wallet_orm_entity_1 = require("./wallet.orm-entity");
const truck_orm_entity_1 = require("./truck.orm-entity");
const open_banking_sync_orm_entity_1 = require("./open-banking-sync.orm-entity");
let UserOrmEntity = class UserOrmEntity {
};
exports.UserOrmEntity = UserOrmEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], UserOrmEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 150 }),
    __metadata("design:type", String)
], UserOrmEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, unique: true }),
    __metadata("design:type", String)
], UserOrmEntity.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'password_hash', type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], UserOrmEntity.prototype, "passwordHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: enums_1.UserRole }),
    __metadata("design:type", String)
], UserOrmEntity.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], UserOrmEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], UserOrmEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => wallet_orm_entity_1.WalletOrmEntity, (wallet) => wallet.user),
    __metadata("design:type", Array)
], UserOrmEntity.prototype, "wallets", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => truck_orm_entity_1.TruckOrmEntity, (truck) => truck.driver),
    __metadata("design:type", Array)
], UserOrmEntity.prototype, "trucks", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => open_banking_sync_orm_entity_1.OpenBankingSyncOrmEntity, (sync) => sync.user),
    __metadata("design:type", Array)
], UserOrmEntity.prototype, "openBankingSyncs", void 0);
exports.UserOrmEntity = UserOrmEntity = __decorate([
    (0, typeorm_1.Entity)({ name: 'users' })
], UserOrmEntity);
//# sourceMappingURL=user.orm-entity.js.map