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
exports.WalletOrmEntity = void 0;
const typeorm_1 = require("typeorm");
const user_orm_entity_1 = require("./user.orm-entity");
const transaction_orm_entity_1 = require("./transaction.orm-entity");
const payable_orm_entity_1 = require("./payable.orm-entity");
let WalletOrmEntity = class WalletOrmEntity {
};
exports.WalletOrmEntity = WalletOrmEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], WalletOrmEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'uuid', unique: true }),
    __metadata("design:type", String)
], WalletOrmEntity.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_orm_entity_1.UserOrmEntity, (user) => user.wallets, { onDelete: 'RESTRICT' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_orm_entity_1.UserOrmEntity)
], WalletOrmEntity.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", String)
], WalletOrmEntity.prototype, "balance", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_sync', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], WalletOrmEntity.prototype, "lastSync", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], WalletOrmEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], WalletOrmEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => transaction_orm_entity_1.TransactionOrmEntity, (transaction) => transaction.wallet),
    __metadata("design:type", Array)
], WalletOrmEntity.prototype, "transactions", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => payable_orm_entity_1.PayableOrmEntity, (payable) => payable.wallet),
    __metadata("design:type", Array)
], WalletOrmEntity.prototype, "payables", void 0);
exports.WalletOrmEntity = WalletOrmEntity = __decorate([
    (0, typeorm_1.Entity)({ name: 'wallets' })
], WalletOrmEntity);
//# sourceMappingURL=wallet.orm-entity.js.map