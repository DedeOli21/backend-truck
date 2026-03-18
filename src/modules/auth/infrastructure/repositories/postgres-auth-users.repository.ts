import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '@database/typeorm/entities/enums';
import { UserOrmEntity } from '@database/typeorm/entities/user.orm-entity';
import { AuthUser, AuthUsersRepository } from '@auth/domain/repositories/auth-users.repository';

@Injectable()
export class PostgresAuthUsersRepository implements AuthUsersRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly usersRepository: Repository<UserOrmEntity>,
  ) {}

  async findByEmail(email: string): Promise<AuthUser | null> {
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

  async findById(id: string): Promise<AuthUser | null> {
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

  async create(user: AuthUser): Promise<AuthUser> {
    const row = this.usersRepository.create({
      id: user.id,
      name: user.name,
      email: user.email.toLowerCase(),
      passwordHash: user.passwordHash,
      role: user.role as UserRole,
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
}





