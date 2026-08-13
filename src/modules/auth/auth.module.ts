import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserOrmEntity } from '@database/typeorm/entities/user.orm-entity';
import { AuthService } from '@applications/auth/application/services/auth.service';
import { AUTH_USERS_REPOSITORY } from '@auth/domain/repositories/auth-users.repository';
import { InMemoryAuthUsersRepository } from '@auth/infrastructure/repositories/in-memory-auth-users.repository';
import { PostgresAuthUsersRepository } from '@auth/infrastructure/repositories/postgres-auth-users.repository';
import { JwtStrategy } from '@auth/jwt.strategy';
import { AuthController } from '@auth/presentation/controllers/auth.controller';

const isTest = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
      signOptions: { expiresIn: '1h' },
    }),
    ...(isTest ? [] : [TypeOrmModule.forFeature([UserOrmEntity])]),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    AuthService,
    {
      provide: AUTH_USERS_REPOSITORY,
      useClass: isTest ? InMemoryAuthUsersRepository : PostgresAuthUsersRepository,
    },
  ],
  exports: [JwtModule, PassportModule, AuthService],
})
export class AuthModule {}





