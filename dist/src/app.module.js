"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const database_module_1 = require("./database/database.module");
const auth_module_1 = require("./modules/auth/auth.module");
const finance_module_1 = require("./modules/finance/finance.module");
const payables_module_1 = require("./modules/payables/payables.module");
const transactions_module_1 = require("./modules/transactions/transactions.module");
const health_controller_1 = require("./common/controllers/health.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            throttler_1.ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
            database_module_1.DatabaseModule,
            auth_module_1.AuthModule,
            transactions_module_1.TransactionsModule,
            finance_module_1.FinanceModule,
            payables_module_1.PayablesModule,
        ],
        controllers: [health_controller_1.HealthController],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map