export type AuthUserRole = 'ADMIN' | 'DRIVER';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: AuthUserRole;
}

export const AUTH_USERS_REPOSITORY = 'AUTH_USERS_REPOSITORY';

export interface AuthUsersRepository {
  findByEmail(email: string): Promise<AuthUser | null>;
  findById(id: string): Promise<AuthUser | null>;
  create(user: AuthUser): Promise<AuthUser>;
}





