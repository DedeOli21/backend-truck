import { Body, Controller, Inject, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from '@applications/auth/application/services/auth.service';
import { LoginDto } from '@auth/presentation/dtos/login.dto';
import { RefreshTokenDto } from '@auth/presentation/dtos/refresh-token.dto';
import { RegisterDto } from '@auth/presentation/dtos/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar novo usuario' })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({
    description: 'Usuario criado com sucesso',
    schema: {
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string', enum: ['ADMIN', 'DRIVER'] },
      },
    },
  })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Autenticar usuario' })
  @ApiBody({ type: LoginDto })
  @ApiCreatedResponse({
    description: 'Login realizado com sucesso',
    schema: {
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        tokenType: { type: 'string', example: 'Bearer' },
        expiresIn: { type: 'number', example: 3600 },
      },
    },
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Atualizar tokens a partir do refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiCreatedResponse({
    description: 'Tokens atualizados com sucesso',
    schema: {
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        tokenType: { type: 'string', example: 'Bearer' },
        expiresIn: { type: 'number', example: 3600 },
      },
    },
  })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }
}
