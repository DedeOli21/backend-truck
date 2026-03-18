"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const open_banking_sync_orm_entity_1 = require("./typeorm/entities/open-banking-sync.orm-entity");
const payable_orm_entity_1 = require("./typeorm/entities/payable.orm-entity");
const transaction_orm_entity_1 = require("./typeorm/entities/transaction.orm-entity");
const truck_orm_entity_1 = require("./typeorm/entities/truck.orm-entity");
const user_orm_entity_1 = require("./typeorm/entities/user.orm-entity");
const wallet_orm_entity_1 = require("./typeorm/entities/wallet.orm-entity");
const isTest = process.env.NODE_ENV === 'test';
let DatabaseModule = class DatabaseModule {
};
exports.DatabaseModule = DatabaseModule;
exports.DatabaseModule = DatabaseModule = __decorate([
    (0, common_1.Module)({
        imports: [
            ...(isTest
                ? []
                : [
                    typeorm_1.TypeOrmModule.forRoot({
                        type: 'postgres',
                        host: process.env.DATABASE_HOST ?? 'localhost',
                        port: Number(process.env.DATABASE_PORT ?? 5432),
                        username: process.env.DATABASE_USER ?? 'truck_admin',
                        password: process.env.DATABASE_PASSWORD ?? 'truck_password',
                        database: process.env.DATABASE_NAME ?? 'truckdb',
                        entities: [
                            user_orm_entity_1.UserOrmEntity,
                            truck_orm_entity_1.TruckOrmEntity,
                            wallet_orm_entity_1.WalletOrmEntity,
                            transaction_orm_entity_1.TransactionOrmEntity,
                            payable_orm_entity_1.PayableOrmEntity,
                            open_banking_sync_orm_entity_1.OpenBankingSyncOrmEntity,
                        ],
                        synchronize: false,
                        ssl: process.env.DATABASE_SSL === 'true'
                            ? { rejectUnauthorized: false }
                            : false,
                    }),
                ]),
        ],
    })
], DatabaseModule);
//# sourceMappingURL=database.module.js.map