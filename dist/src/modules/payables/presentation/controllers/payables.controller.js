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
exports.PayablesController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const swagger_1 = require("@nestjs/swagger");
const roles_decorator_1 = require("../../../../common/decorators/roles.decorator");
const jwt_auth_guard_1 = require("../../../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../../../common/guards/roles.guard");
const payables_service_1 = require("../../application/services/payables.service");
let PayablesController = class PayablesController {
    constructor(payablesService) {
        this.payablesService = payablesService;
    }
    async list(req) {
        return this.payablesService.listUrgentPayables(req.user.sub);
    }
    async pay(req, id) {
        return this.payablesService.payPayable(req.user.sub, id);
    }
};
exports.PayablesController = PayablesController;
__decorate([
    (0, common_1.Get)(),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 20 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Listar contas urgentes pendentes' }),
    (0, swagger_1.ApiOkResponse)({
        description: 'Contas urgentes retornadas com sucesso',
        schema: {
            type: 'array',
            items: {
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    category: { type: 'string', enum: ['MAINTENANCE', 'INSURANCE', 'FINANCING'] },
                    description: { type: 'string' },
                    amount: { type: 'number' },
                    dueDate: { type: 'string', format: 'date-time' },
                    urgent: { type: 'boolean' },
                    paid: { type: 'boolean' },
                    paidAt: { type: 'string', format: 'date-time', nullable: true },
                    transactionId: { type: 'string', format: 'uuid', nullable: true },
                },
            },
        },
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PayablesController.prototype, "list", null);
__decorate([
    (0, common_1.Patch)(':id/pay'),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 10 } }),
    (0, swagger_1.ApiOperation)({ summary: 'Baixar conta a pagar' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID da conta a pagar', type: 'string' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Conta baixada com sucesso' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PayablesController.prototype, "pay", null);
exports.PayablesController = PayablesController = __decorate([
    (0, swagger_1.ApiTags)('Payables'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.Controller)('payables'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('ADMIN', 'DRIVER'),
    __metadata("design:paramtypes", [payables_service_1.PayablesService])
], PayablesController);
//# sourceMappingURL=payables.controller.js.map