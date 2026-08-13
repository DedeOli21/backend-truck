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
exports.TransactionsController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../../../../common/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../../../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../../../common/guards/roles.guard");
const transactions_service_1 = require("../../application/services/transactions.service");
const create_freight_dto_1 = require("../dtos/create-freight.dto");
const create_fuel_dto_1 = require("../dtos/create-fuel.dto");
let TransactionsController = class TransactionsController {
    constructor(transactionsService) {
        this.transactionsService = transactionsService;
    }
    async list(req) {
        return this.transactionsService.listByUser(req.user.sub);
    }
    async createFreight(req, dto) {
        return this.transactionsService.createFreight(req.user.sub, dto);
    }
    async createFuel(req, dto) {
        return this.transactionsService.createFuel(req.user.sub, dto);
    }
};
exports.TransactionsController = TransactionsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar extrato de movimentacoes' }),
    (0, swagger_1.ApiOkResponse)({
        description: 'Extrato retornado com sucesso',
        schema: {
            type: 'array',
            items: {
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    userId: { type: 'string', format: 'uuid' },
                    type: { type: 'string', enum: ['FREIGHT', 'FUEL'] },
                    amount: { type: 'number' },
                    description: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
                },
            },
        },
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TransactionsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('freight'),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 10 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Registrar entrada de frete' }),
    (0, swagger_1.ApiBody)({ type: create_freight_dto_1.CreateFreightDto }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Frete registrado com sucesso' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_freight_dto_1.CreateFreightDto]),
    __metadata("design:returntype", Promise)
], TransactionsController.prototype, "createFreight", null);
__decorate([
    (0, common_1.Post)('fuel'),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 10 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Registrar saida de combustivel' }),
    (0, swagger_1.ApiBody)({ type: create_fuel_dto_1.CreateFuelDto }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Abastecimento registrado com sucesso' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_fuel_dto_1.CreateFuelDto]),
    __metadata("design:returntype", Promise)
], TransactionsController.prototype, "createFuel", null);
exports.TransactionsController = TransactionsController = __decorate([
    (0, swagger_1.ApiTags)('Transactions'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.Controller)('transactions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'DRIVER'),
    __param(0, (0, common_1.Inject)(transactions_service_1.TransactionsService)),
    __metadata("design:paramtypes", [transactions_service_1.TransactionsService])
], TransactionsController);
//# sourceMappingURL=transactions.controller.js.map