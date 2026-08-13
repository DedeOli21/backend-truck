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

    return this.toDomain(row);
  }

  async findById(id: string): Promise<AuthUser | null> {
    const row = await this.usersRepository.findOne({ where: { id } });
    if (!row) {
      return null;
    }

    return this.toDomain(row);
  }

  async findByDriverId(driverId: string): Promise<AuthUser | null> {
    const row = await this.usersRepository.findOne({ where: { driverId } });
    if (!row) {
      return null;
    }

    return this.toDomain(row);
  }

  async create(user: AuthUser): Promise<AuthUser> {
    const row = this.usersRepository.create({
      id: user.id,
      name: user.name,
      email: user.email.toLowerCase(),
      passwordHash: user.passwordHash,
      role: user.role as UserRole,
      driverId: user.driverId ?? null,
    });

    const saved = await this.usersRepository.save(row);

    return this.toDomain(saved);
  }

  async updateCredentials(
    id: string,
    data: { email: string; passwordHash: string },
  ): Promise<AuthUser> {
    const row = await this.usersRepository.findOne({ where: { id } });
    if (!row) {
      throw new Error('Usuario nao encontrado');
    }
    row.email = data.email.toLowerCase();
    row.passwordHash = data.passwordHash;
    await this.usersRepository.save(row);

    return this.toDomain(row);
  }

  private toDomain(row: UserOrmEntity): AuthUser {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      passwordHash: row.passwordHash,
      role: row.role,
      driverId: row.driverId ?? null,
    };
  }
}





