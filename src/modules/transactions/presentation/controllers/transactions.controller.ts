import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '@common/decorators/roles.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { TransactionsService } from '@applications/transactions/application/services/transactions.service';
import { CreateFreightDto } from '@transactions/presentation/dtos/create-freight.dto';
import { CreateFuelDto } from '@transactions/presentation/dtos/create-fuel.dto';

@ApiTags('Transações')
@ApiBearerAuth('access-token')
@Controller('transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'DRIVER')
export class TransactionsController {
  constructor(
    @Inject(TransactionsService)
    private readonly transactionsService: TransactionsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar extrato de movimentacoes' })
  @ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
  @ApiOkResponse({
    description: 'Extrato retornado com sucesso',
    schema: {
      type: 'array',
      items: {
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          type: { type: 'string', enum: ['FREIGHT', 'FUEL'] },
          amount: { type: 'number' },
          description: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async list(@Req() req: AuthenticatedRequest) {
    return this.transactionsService.listByUser(req.user.sub);
  }

  @Post('freight')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Registrar entrada de frete' })
  @ApiBadRequestResponse({ description: 'Valor não positivo ou descrição muito curta.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
  @ApiBody({ type: CreateFreightDto })
  @ApiCreatedResponse({ description: 'Frete registrado com sucesso' })
  async createFreight(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateFreightDto,
  ) {
    return this.transactionsService.createFreight(req.user.sub, dto);
  }

  @Post('fuel')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Registrar saida de combustivel' })
  @ApiBadRequestResponse({ description: 'Valor não positivo, descrição muito curta ou saldo insuficiente.' })
  @ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
  @ApiBody({ type: CreateFuelDto })
  @ApiCreatedResponse({ description: 'Abastecimento registrado com sucesso' })
  async createFuel(@Req() req: AuthenticatedRequest, @Body() dto: CreateFuelDto) {
    return this.transactionsService.createFuel(req.user.sub, dto);
  }
}
