import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '@common/decorators/roles.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { FinanceService } from '@applications/finance/application/services/finance.service';
import { SyncOpenBankingDto } from '@finance/presentation/dtos/sync-open-banking.dto';

@ApiTags('Finance')
@ApiBearerAuth('access-token')
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'DRIVER')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('balance')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Consultar saldo consolidado' })
  @ApiOkResponse({
    description: 'Saldo retornado com sucesso',
    schema: {
      properties: {
        walletBalance: { type: 'number' },
        openBankingBalance: { type: 'number' },
        totalAvailable: { type: 'number' },
      },
    },
  })
  async getBalance(@Req() req: AuthenticatedRequest) {
    return this.financeService.getBalance(req.user.sub);
  }

  @Post('open-banking/sync')
  @Roles('ADMIN')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Sincronizar saldo via Open Banking (ADMIN)' })
  @ApiBody({ type: SyncOpenBankingDto })
  @ApiCreatedResponse({ description: 'Sincronizacao concluida com sucesso' })
  async syncOpenBanking(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SyncOpenBankingDto,
  ) {
    return this.financeService.syncOpenBanking(req.user.sub, dto);
  }
}
