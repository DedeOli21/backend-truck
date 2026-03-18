import { AuthUser, AuthUsersRepository } from '@auth/domain/repositories/auth-users.repository';
export declare class InMemoryAuthUsersRepository implements AuthUsersRepository {
    private readonly users;
    findByEmail(email: string): Promise<AuthUser | null>;
    findById(id: string): Promise<AuthUser | null>;
    create(user: AuthUser): Promise<AuthUser>;
}
