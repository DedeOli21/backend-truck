import { Repository } from 'typeorm';
import { UserOrmEntity } from '@database/typeorm/entities/user.orm-entity';
import { AuthUser, AuthUsersRepository } from '@auth/domain/repositories/auth-users.repository';
export declare class PostgresAuthUsersRepository implements AuthUsersRepository {
    private readonly usersRepository;
    constructor(usersRepository: Repository<UserOrmEntity>);
    findByEmail(email: string): Promise<AuthUser | null>;
    findById(id: string): Promise<AuthUser | null>;
    create(user: AuthUser): Promise<AuthUser>;
}
