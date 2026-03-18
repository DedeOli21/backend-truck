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
exports.TruckOrmEntity = void 0;
const typeorm_1 = require("typeorm");
const user_orm_entity_1 = require("./user.orm-entity");
const transaction_orm_entity_1 = require("./transaction.orm-entity");
let TruckOrmEntity = class TruckOrmEntity {
};
exports.TruckOrmEntity = TruckOrmEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)('uuid'),
    __metadata("design:type", String)
], TruckOrmEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, unique: true }),
    __metadata("design:type", String)
], TruckOrmEntity.prototype, "plate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'brand_model', type: 'varchar', length: 120 }),
    __metadata("design:type", String)
], TruckOrmEntity.prototype, "brandModel", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Object)
], TruckOrmEntity.prototype, "year", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'driver_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], TruckOrmEntity.prototype, "driverId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_orm_entity_1.UserOrmEntity, (user) => user.trucks, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'driver_id' }),
    __metadata("design:type", Object)
], TruckOrmEntity.prototype, "driver", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], TruckOrmEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], TruckOrmEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => transaction_orm_entity_1.TransactionOrmEntity, (transaction) => transaction.truck),
    __metadata("design:type", Array)
], TruckOrmEntity.prototype, "transactions", void 0);
exports.TruckOrmEntity = TruckOrmEntity = __decorate([
    (0, typeorm_1.Entity)({ name: 'trucks' })
], TruckOrmEntity);
//# sourceMappingURL=truck.orm-entity.js.map