import { AuthService } from '@applications/auth/application/services/auth.service';
import { InMemoryAuthUsersRepository } from '@auth/infrastructure/repositories/in-memory-auth-users.repository';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService(new InMemoryAuthUsersRepository());
  });

  it('deve registrar usuario e realizar login com access/refresh tokens', async () => {
    await service.register({
      name: 'Admin Teste',
      email: 'admin@teste.com',
      password: '123456',
      role: 'ADMIN',
    });

    const login = await service.login({
      email: 'admin@teste.com',
      password: '123456',
    });

    expect(login.accessToken).toBeTruthy();
    expect(login.refreshToken).toBeTruthy();
  });
});





