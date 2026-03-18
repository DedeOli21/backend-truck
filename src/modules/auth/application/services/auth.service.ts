import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { randomUUID } from 'crypto';
import {
  AUTH_USERS_REPOSITORY,
  AuthUser,
  AuthUsersRepository,
} from '@auth/domain/repositories/auth-users.repository';
import { LoginDto } from '@auth/presentation/dtos/login.dto';
import { RegisterDto } from '@auth/presentation/dtos/register.dto';

@Injectable()
export class AuthService {
  private readonly jwtService: JwtService;

  constructor(
    @Inject(AUTH_USERS_REPOSITORY)
    private readonly usersRepository: AuthUsersRepository,
  ) {
    this.jwtService = new JwtService();
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('Email ja cadastrado');
    }

    const passwordHash = await hash(dto.password, 10);

    const created = await this.usersRepository.create({
      id: randomUUID(),
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

  async login(dto: LoginDto) {
    const user = await this.validateCredentials(dto.email, dto.password);
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        role: 'ADMIN' | 'DRIVER';
        type: 'refresh';
      }>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Refresh token invalido');
      }

      const user = await this.usersRepository.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Usuario nao encontrado');
      }

      return this.issueTokens(user);
    } catch {
      throw new UnauthorizedException('Refresh token invalido');
    }
  }

  private async validateCredentials(email: string, password: string): Promise<AuthUser> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    const validPassword = await compare(password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException('Credenciais invalidas');
    }

    return user;
  }

  private async issueTokens(user: AuthUser) {
    const payload = { sub: user.id, role: user.role };

    const accessToken = await this.jwtService.signAsync(
      { ...payload, type: 'access' },
      {
        secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
        expiresIn: '1h',
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      { ...payload, type: 'refresh' },
      {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
        expiresIn: '7d',
      },
    );

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
    };
  }
}





