import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '@common/decorators/roles.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { FinancialService } from '@applications/financial/application/services/financial.service';
import { CreateFinancialTransactionDto } from '@applications/financial/presentation/dtos/create-financial-transaction.dto';
import { GenerateInvoiceDto } from '@applications/financial/presentation/dtos/generate-invoice.dto';
import { ListFinancialTransactionsQuery } from '@applications/financial/presentation/dtos/list-financial-transactions.query';
import { SettleFinancialTransactionDto } from '@applications/financial/presentation/dtos/settle-financial-transaction.dto';

@ApiTags('Financeiro')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
@ApiForbiddenResponse({ description: 'Rota restrita a ADMIN.' })
@Controller('financial')
@UseGuards(JwtAuthGuard, RolesGuard)
// Cada gestor só enxerga o próprio financeiro: o recorte é feito no service pelo dono.
@Roles('ADMIN')
export class FinancialController {
  constructor(@Inject(FinancialService) private readonly service: FinancialService) {}

  @Post('transactions')
  @ApiOperation({ summary: 'Lançar conta a pagar ou a receber' })
  @ApiCreatedResponse({ description: 'Lançamento criado.' })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateFinancialTransactionDto) {
    return this.service.create(dto, req.user.sub);
  }

  @Get('transactions')
  @ApiOperation({
    summary: 'Listar contas a pagar e a receber',
    description:
      'Ordenado por vencimento. A situação é calculada na hora: vencido e sem baixa aparece como ATRASADO.',
  })
  @ApiQuery({ name: 'account', required: false, enum: ['PAGAR', 'RECEBER'] })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'freightId', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'Vencimento a partir de (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'Vencimento até (YYYY-MM-DD)' })
  @ApiOkResponse({ description: 'Lista de lançamentos.' })
  async list(@Req() req: AuthenticatedRequest, @Query() query: ListFinancialTransactionsQuery) {
    return this.service.list(query, req.user.sub);
  }

  @Patch('transactions/:id/settle')
  @ApiOperation({ summary: 'Dar baixa no lançamento' })
  @ApiOkResponse({ description: 'Baixa registrada.' })
  @ApiNotFoundResponse({ description: 'Lançamento não encontrado.' })
  async settle(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SettleFinancialTransactionDto,
  ) {
    return this.service.settle(id, dto, req.user.sub);
  }

  @Delete('transactions/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remover lançamento' })
  @ApiNoContentResponse({ description: 'Lançamento removido.' })
  @ApiNotFoundResponse({ description: 'Lançamento não encontrado.' })
  async remove(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id, req.user.sub);
  }

  @Get('cash-flow')
  @ApiOperation({
    summary: 'Fluxo de caixa projetado',
    description: 'Próximos 30 dias, com o saldo acumulado dia a dia a partir dos vencimentos.',
  })
  @ApiOkResponse({ description: 'Projeção diária.' })
  async cashFlow(@Req() req: AuthenticatedRequest) {
    return this.service.cashFlow(req.user.sub);
  }

  @Get('income-statement')
  @ApiOperation({
    summary: 'DRE do período',
    description:
      'Receita bruta menos deduções, custos operacionais e despesas administrativas, conforme a categoria de cada lançamento.',
  })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'Vencimento a partir de (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'Vencimento até (YYYY-MM-DD)' })
  @ApiOkResponse({ description: 'DRE calculado.' })
  async incomeStatement(
    @Req() req: AuthenticatedRequest,
    @Query('customerId') customerId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.incomeStatement(req.user.sub, { customerId, from, to });
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Listar faturas consolidadas', description: 'Da mais recente para a mais antiga.' })
  @ApiOkResponse({ description: 'Lista de faturas.' })
  async listInvoices(@Req() req: AuthenticatedRequest) {
    return this.service.listInvoices(req.user.sub);
  }

  @Post('invoices')
  @ApiOperation({
    summary: 'Gerar fatura consolidada',
    description:
      'Junta em uma fatura os fretes concluídos do cliente no período. O valor sai do próprio frete.',
  })
  @ApiCreatedResponse({ description: 'Fatura gerada.' })
  @ApiBadRequestResponse({ description: 'Período inválido ou sem frete concluído para faturar.' })
  async generateInvoice(@Req() req: AuthenticatedRequest, @Body() dto: GenerateInvoiceDto) {
    return this.service.generateInvoice(dto, req.user.sub);
  }
}
