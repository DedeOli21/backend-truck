import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '@common/decorators/roles.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { FreightExpensesService } from '@applications/freight-expenses/application/services/freight-expenses.service';
import { CreateFreightExpenseDto } from '@applications/freight-expenses/presentation/dtos/create-freight-expense.dto';

@ApiTags('Fretes')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
@ApiNotFoundResponse({ description: 'Frete não encontrado.' })
@Controller('freights/:freightId')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'DRIVER')
export class FreightExpensesController {
  constructor(
    @Inject(FreightExpensesService) private readonly service: FreightExpensesService,
  ) {}

  @Post('expenses')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Lançar despesa do frete',
    description: 'O comprovante entra como link (`receiptUrl`); esta rota não recebe arquivo.',
  })
  @ApiCreatedResponse({ description: 'Despesa lançada.' })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  async create(
    @Param('freightId', ParseUUIDPipe) freightId: string,
    @Body() dto: CreateFreightExpenseDto,
  ) {
    return this.service.create(freightId, dto);
  }

  @Get('expenses')
  @ApiOperation({ summary: 'Listar despesas do frete', description: 'Da mais recente para a mais antiga.' })
  @ApiOkResponse({ description: 'Lista de despesas.' })
  async list(@Param('freightId', ParseUUIDPipe) freightId: string) {
    return this.service.listByFreight(freightId);
  }

  @Delete('expenses/:id')
  @Roles('ADMIN')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remover despesa do frete' })
  @ApiNoContentResponse({ description: 'Despesa removida.' })
  @ApiNotFoundResponse({ description: 'Despesa não encontrada para este frete.' })
  async remove(
    @Param('freightId', ParseUUIDPipe) freightId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.service.remove(freightId, id);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Resumo financeiro do frete',
    description: 'Valor do frete menos as despesas lançadas, com a margem em percentual.',
  })
  @ApiOkResponse({ description: 'Resumo calculado.' })
  async summary(@Param('freightId', ParseUUIDPipe) freightId: string) {
    return this.service.summary(freightId);
  }

  @Get('timeline')
  @ApiOperation({
    summary: 'Linha do tempo do frete',
    description: 'Histórico de mudanças de status, do mais antigo para o mais recente.',
  })
  @ApiOkResponse({ description: 'Eventos da timeline.' })
  async timeline(@Param('freightId', ParseUUIDPipe) freightId: string) {
    return this.service.timeline(freightId);
  }
}
