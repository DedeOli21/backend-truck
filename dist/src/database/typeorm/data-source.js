"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const entities_1 = require("./entities");
exports.default = new typeorm_1.DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 5432),
    username: process.env.DATABASE_USER ?? 'truck_admin',
    password: process.env.DATABASE_PASSWORD ?? 'truck_password',
    database: process.env.DATABASE_NAME ?? 'truckdb',
    ssl: process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
    entities: [
        entities_1.UserOrmEntity,
        entities_1.TruckOrmEntity,
        entities_1.WalletOrmEntity,
        entities_1.TransactionOrmEntity,
        entities_1.PayableOrmEntity,
        entities_1.OpenBankingSyncOrmEntity,
    ],
    migrations: ['src/database/typeorm/migrations/*.ts', 'dist/database/typeorm/migrations/*.js'],
    synchronize: false,
});
//# sourceMappingURL=data-source.js.map