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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcryptjs_1 = require("bcryptjs");
const crypto_1 = require("crypto");
const auth_users_repository_1 = require("../../domain/repositories/auth-users.repository");
let AuthService = class AuthService {
    constructor(usersRepository) {
        this.usersRepository = usersRepository;
        this.jwtService = new jwt_1.JwtService();
    }
    async register(dto) {
        const existing = await this.usersRepository.findByEmail(dto.email);
        if (existing) {
            throw new common_1.BadRequestException('Email ja cadastrado');
        }
        const passwordHash = await (0, bcryptjs_1.hash)(dto.password, 10);
        const created = await this.usersRepository.create({
            id: (0, crypto_1.randomUUID)(),
            name: dto.name,
            email: dto.email.toLowerCase(),
            passwordHash,
            role: dto.role,
        });
        return {
            id: created.id,
            name: created.name,
            email: created.email,
            role: created.role,
        };
    }
    async login(dto) {
        const user = await this.validateCredentials(dto.email, dto.password);
        return this.issueTokens(user);
    }
    async refresh(refreshToken) {
        try {
            const payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
            });
            if (payload.type !== 'refresh') {
                throw new common_1.UnauthorizedException('Refresh token invalido');
            }
            const user = await this.usersRepository.findById(payload.sub);
            if (!user) {
                throw new common_1.UnauthorizedException('Usuario nao encontrado');
            }
            return this.issueTokens(user);
        }
        catch {
            throw new common_1.UnauthorizedException('Refresh token invalido');
        }
    }
    async validateCredentials(email, password) {
        const user = await this.usersRepository.findByEmail(email);
        if (!user) {
            throw new common_1.UnauthorizedException('Credenciais invalidas');
        }
        const validPassword = await (0, bcryptjs_1.compare)(password, user.passwordHash);
        if (!validPassword) {
            throw new common_1.UnauthorizedException('Credenciais invalidas');
        }
        return user;
    }
    async issueTokens(user) {
        const payload = { sub: user.id, role: user.role };
        const accessToken = await this.jwtService.signAsync({ ...payload, type: 'access' }, {
            secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
            expiresIn: '1h',
        });
        const refreshToken = await this.jwtService.signAsync({ ...payload, type: 'refresh' }, {
            secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
            expiresIn: '7d',
        });
        return {
            accessToken,
            refreshToken,
            tokenType: 'Bearer',
            expiresIn: 3600,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(auth_users_repository_1.AUTH_USERS_REPOSITORY)),
    __metadata("design:paramtypes", [Object])
], AuthService);
//# sourceMappingURL=auth.service.js.map