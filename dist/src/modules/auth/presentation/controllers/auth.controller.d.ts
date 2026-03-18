import { AuthService } from '@applications/auth/application/services/auth.service';
import { LoginDto } from '@auth/presentation/dtos/login.dto';
import { RefreshTokenDto } from '@auth/presentation/dtos/refresh-token.dto';
import { RegisterDto } from '@auth/presentation/dtos/register.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        id: string;
        name: string;
        email: string;
        role: import("../../domain/repositories/auth-users.repository").AuthUserRole;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        tokenType: string;
        expiresIn: number;
    }>;
    refresh(dto: RefreshTokenDto): Promise<{
        accessToken: string;
        refreshToken: string;
        tokenType: string;
        expiresIn: number;
    }>;
}
