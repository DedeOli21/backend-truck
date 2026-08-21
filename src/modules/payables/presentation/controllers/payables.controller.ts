import {
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '@common/decorators/roles.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { PayablesService } from '@applications/payables/application/services/payables.service';

@ApiTags('Contas a Pagar')
@ApiBearerAuth('access-token')
@Controller('payables')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'DRIVER')
export class PayablesController {
  constructor(@Inject(PayablesService) private readonly payablesService: PayablesService) {}

  @Get()
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: 'Listar contas urgentes pendentes' })
  @ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
  @ApiOkResponse({
    description: 'Contas urgentes retornadas com sucesso',
    schema: {
      type: 'array',
      items: {
        properties: {
          id: { type: 'string', format: 'uuid' },
          category: { type: 'string', enum: ['MAINTENANCE', 'INSURANCE', 'FINANCING'] },
          description: { type: 'string' },
          amount: { type: 'number' },
          dueDate: { type: 'string', format: 'date-time' },
          urgent: { type: 'boolean' },
          paid: { type: 'boolean' },
          paidAt: { type: 'string', format: 'date-time', nullable: true },
          transactionId: { type: 'string', format: 'uuid', nullable: true },
        },
      },
    },
  })
  async list(@Req() req: AuthenticatedRequest) {
    return this.payablesService.listUrgentPayables(req.user.sub);
  }

  @Patch(':id/pay')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Baixar conta a pagar' })
  @ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
  @ApiNotFoundResponse({ description: 'Conta não encontrada.' })
  @ApiParam({ name: 'id', description: 'ID da conta a pagar', type: 'string' })
  @ApiOkResponse({ description: 'Conta baixada com sucesso' })
  async pay(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.payablesService.payPayable(req.user.sub, id);
  }
}
