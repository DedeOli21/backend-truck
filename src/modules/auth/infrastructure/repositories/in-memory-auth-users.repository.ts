import { Injectable } from '@nestjs/common';
import { AuthUser, AuthUsersRepository } from '@auth/domain/repositories/auth-users.repository';

@Injectable()
export class InMemoryAuthUsersRepository implements AuthUsersRepository {
  private readonly users = new Map<string, AuthUser>();

  async findByEmail(email: string): Promise<AuthUser | null> {
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return user;
      }
    }
    return null;
  }

  async findById(id: string): Promise<AuthUser | null> {
    return this.users.get(id) ?? null;
  }

  async create(user: AuthUser): Promise<AuthUser> {
    this.users.set(user.id, user);
    return user;
  }
}





