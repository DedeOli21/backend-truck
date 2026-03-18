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
exports.TransactionOrmEntity = void 0;
const typeorm_1 = require("typeorm");
const enums_1 = require("./enums");
const wallet_orm_entity_1 = require("./wallet.orm-entity");
const truck_orm_entity_1 = require("./truck.orm-entity");
let TransactionOrmEntity = class TransactionOrmEntity {
};
exports.TransactionOrmEntity = TransactionOrmEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], TransactionOrmEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'wallet_id', type: 'uuid' }),
    __metadata("design:type", String)
], TransactionOrmEntity.prototype, "walletId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => wallet_orm_entity_1.WalletOrmEntity, (wallet) => wallet.transactions, {
        onDelete: 'RESTRICT',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'wallet_id' }),
    __metadata("design:type", wallet_orm_entity_1.WalletOrmEntity)
], TransactionOrmEntity.prototype, "wallet", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'truck_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], TransactionOrmEntity.prototype, "truckId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => truck_orm_entity_1.TruckOrmEntity, (truck) => truck.transactions, {
        nullable: true,
        onDelete: 'SET NULL',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'truck_id' }),
    __metadata("design:type", Object)
], TransactionOrmEntity.prototype, "truck", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: enums_1.TransactionDirection }),
    __metadata("design:type", String)
], TransactionOrmEntity.prototype, "direction", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: enums_1.TransactionCategory }),
    __metadata("design:type", String)
], TransactionOrmEntity.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 14, scale: 2 }),
    __metadata("design:type", String)
], TransactionOrmEntity.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], TransactionOrmEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'transaction_date', type: 'timestamptz', default: () => 'now()' }),
    __metadata("design:type", Date)
], TransactionOrmEntity.prototype, "transactionDate", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], TransactionOrmEntity.prototype, "createdAt", void 0);
exports.TransactionOrmEntity = TransactionOrmEntity = __decorate([
    (0, typeorm_1.Entity)({ name: 'transactions' })
], TransactionOrmEntity);
//# sourceMappingURL=transaction.orm-entity.js.map