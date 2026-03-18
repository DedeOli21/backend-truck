import { AuthUsersRepository } from '@auth/domain/repositories/auth-users.repository';
import { LoginDto } from '@auth/presentation/dtos/login.dto';
import { RegisterDto } from '@auth/presentation/dtos/register.dto';
export declare class AuthService {
    private readonly usersRepository;
    private readonly jwtService;
    constructor(usersRepository: AuthUsersRepository);
    register(dto: RegisterDto): Promise<{
        id: string;
        name: string;
        email: string;
        role: import("@auth/domain/repositories/auth-users.repository").AuthUserRole;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        tokenType: string;
        expiresIn: number;
    }>;
    refresh(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        tokenType: string;
        expiresIn: number;
    }>;
    private validateCredentials;
    private issueTokens;
}
