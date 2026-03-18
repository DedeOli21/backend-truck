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
exports.OpenBankingSyncOrmEntity = void 0;
const typeorm_1 = require("typeorm");
const user_orm_entity_1 = require("./user.orm-entity");
let OpenBankingSyncOrmEntity = class OpenBankingSyncOrmEntity {
};
exports.OpenBankingSyncOrmEntity = OpenBankingSyncOrmEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], OpenBankingSyncOrmEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'uuid' }),
    __metadata("design:type", String)
], OpenBankingSyncOrmEntity.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_orm_entity_1.UserOrmEntity, (user) => user.openBankingSyncs, {
        onDelete: 'RESTRICT',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_orm_entity_1.UserOrmEntity)
], OpenBankingSyncOrmEntity.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 150 }),
    __metadata("design:type", String)
], OpenBankingSyncOrmEntity.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'available_balance', type: 'numeric', precision: 14, scale: 2 }),
    __metadata("design:type", String)
], OpenBankingSyncOrmEntity.prototype, "availableBalance", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'synced_at', type: 'timestamptz', default: () => 'now()' }),
    __metadata("design:type", Date)
], OpenBankingSyncOrmEntity.prototype, "syncedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], OpenBankingSyncOrmEntity.prototype, "createdAt", void 0);
exports.OpenBankingSyncOrmEntity = OpenBankingSyncOrmEntity = __decorate([
    (0, typeorm_1.Entity)({ name: 'open_banking_syncs' })
], OpenBankingSyncOrmEntity);
//# sourceMappingURL=open-banking-sync.orm-entity.js.map