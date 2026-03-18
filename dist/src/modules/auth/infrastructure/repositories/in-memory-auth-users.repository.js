"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryAuthUsersRepository = void 0;
const common_1 = require("@nestjs/common");
let InMemoryAuthUsersRepository = class InMemoryAuthUsersRepository {
    constructor() {
        this.users = new Map();
    }
    async findByEmail(email) {
        for (const user of this.users.values()) {
            if (user.email.toLowerCase() === email.toLowerCase()) {
                return user;
            }
        }
        return null;
    }
    async findById(id) {
        return this.users.get(id) ?? null;
    }
    async create(user) {
        this.users.set(user.id, user);
        return user;
    }
};
exports.InMemoryAuthUsersRepository = InMemoryAuthUsersRepository;
exports.InMemoryAuthUsersRepository = InMemoryAuthUsersRepository = __decorate([
    (0, common_1.Injectable)()
], InMemoryAuthUsersRepository);
//# sourceMappingURL=in-memory-auth-users.repository.js.map