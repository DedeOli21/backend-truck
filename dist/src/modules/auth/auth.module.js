"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const typeorm_1 = require("@nestjs/typeorm");
const user_orm_entity_1 = require("../../database/typeorm/entities/user.orm-entity");
const auth_service_1 = require("./application/services/auth.service");
const auth_users_repository_1 = require("./domain/repositories/auth-users.repository");
const in_memory_auth_users_repository_1 = require("./infrastructure/repositories/in-memory-auth-users.repository");
const postgres_auth_users_repository_1 = require("./infrastructure/repositories/postgres-auth-users.repository");
const jwt_strategy_1 = require("./jwt.strategy");
const auth_controller_1 = require("./presentation/controllers/auth.controller");
const isTest = process.env.NODE_ENV === 'test';
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule,
            jwt_1.JwtModule.register({
                secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
                signOptions: { expiresIn: '1h' },
            }),
            ...(isTest ? [] : [typeorm_1.TypeOrmModule.forFeature([user_orm_entity_1.UserOrmEntity])]),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [
            jwt_strategy_1.JwtStrategy,
            auth_service_1.AuthService,
            {
                provide: auth_users_repository_1.AUTH_USERS_REPOSITORY,
                useClass: isTest ? in_memory_auth_users_repository_1.InMemoryAuthUsersRepository : postgres_auth_users_repository_1.PostgresAuthUsersRepository,
            },
        ],
        exports: [jwt_1.JwtModule, passport_1.PassportModule, auth_service_1.AuthService],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map