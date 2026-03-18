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
exports.PayableOrmEntity = void 0;
const typeorm_1 = require("typeorm");
const enums_1 = require("./enums");
const wallet_orm_entity_1 = require("./wallet.orm-entity");
const transaction_orm_entity_1 = require("./transaction.orm-entity");
let PayableOrmEntity = class PayableOrmEntity {
};
exports.PayableOrmEntity = PayableOrmEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], PayableOrmEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'wallet_id', type: 'uuid' }),
    __metadata("design:type", String)
], PayableOrmEntity.prototype, "walletId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => wallet_orm_entity_1.WalletOrmEntity, (wallet) => wallet.payables, {
        onDelete: 'RESTRICT',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'wallet_id' }),
    __metadata("design:type", wallet_orm_entity_1.WalletOrmEntity)
], PayableOrmEntity.prototype, "wallet", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], PayableOrmEntity.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: enums_1.PayableCategoryDb }),
    __metadata("design:type", String)
], PayableOrmEntity.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 14, scale: 2 }),
    __metadata("design:type", String)
], PayableOrmEntity.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'due_date', type: 'date' }),
    __metadata("design:type", String)
], PayableOrmEntity.prototype, "dueDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: enums_1.PayableStatus, default: enums_1.PayableStatus.PENDING }),
    __metadata("design:type", String)
], PayableOrmEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'paid_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], PayableOrmEntity.prototype, "paidAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'transaction_id', type: 'uuid', nullable: true, unique: true }),
    __metadata("design:type", Object)
], PayableOrmEntity.prototype, "transactionId", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => transaction_orm_entity_1.TransactionOrmEntity, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'transaction_id' }),
    __metadata("design:type", Object)
], PayableOrmEntity.prototype, "transaction", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PayableOrmEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], PayableOrmEntity.prototype, "updatedAt", void 0);
exports.PayableOrmEntity = PayableOrmEntity = __decorate([
    (0, typeorm_1.Entity)({ name: 'payables' })
], PayableOrmEntity);
//# sourceMappingURL=payable.orm-entity.js.map