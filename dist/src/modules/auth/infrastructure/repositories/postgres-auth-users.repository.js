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
exports.PostgresAuthUsersRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_orm_entity_1 = require("../../../../database/typeorm/entities/user.orm-entity");
let PostgresAuthUsersRepository = class PostgresAuthUsersRepository {
    constructor(usersRepository) {
        this.usersRepository = usersRepository;
    }
    async findByEmail(email) {
        const row = await this.usersRepository.findOne({
            where: { email: email.toLowerCase() },
        });
        if (!row) {
            return null;
        }
        return {
            id: row.id,
            name: row.name,
            email: row.email,
            passwordHash: row.passwordHash,
            role: row.role,
        };
    }
    async findById(id) {
        const row = await this.usersRepository.findOne({ where: { id } });
        if (!row) {
            return null;
        }
        return {
            id: row.id,
            name: row.name,
            email: row.email,
            passwordHash: row.passwordHash,
            role: row.role,
        };
    }
    async create(user) {
        const row = this.usersRepository.create({
            id: user.id,
            name: user.name,
            email: user.email.toLowerCase(),
            passwordHash: user.passwordHash,
            role: user.role,
        });
        const saved = await this.usersRepository.save(row);
        return {
            id: saved.id,
            name: saved.name,
            email: saved.email,
            passwordHash: saved.passwordHash,
            role: saved.role,
        };
    }
};
exports.PostgresAuthUsersRepository = PostgresAuthUsersRepository;
exports.PostgresAuthUsersRepository = PostgresAuthUsersRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_orm_entity_1.UserOrmEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], PostgresAuthUsersRepository);
//# sourceMappingURL=postgres-auth-users.repository.js.map