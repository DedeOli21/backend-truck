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
import { Throttle } from '@nestjs/throttler';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
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
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { DriverPaymentsService } from '@applications/driver-payments/application/services/driver-payments.service';
import { CreateDriverPaymentDto } from '@driver-payments/presentation/dtos/create-driver-payment.dto';
import { UpdateDriverPaymentDto } from '@driver-payments/presentation/dtos/update-driver-payment.dto';
import { ListDriverPaymentsQueryDto } from '@driver-payments/presentation/dtos/list-driver-payments-query.dto';

@ApiTags('Pagamentos de Motorista')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
@ApiForbiddenResponse({ description: 'Rota restrita a ADMIN.' })
@Controller('driver-payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class DriverPaymentsController {
  constructor(@Inject(DriverPaymentsService) private readonly service: DriverPaymentsService) {}

  @Get()
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: 'Listar pagamentos de motoristas' })
  @ApiOkResponse({ description: 'Lista de pagamentos.' })
  list(@Req() req: AuthenticatedRequest, @Query() query: ListDriverPaymentsQueryDto) {
    return this.service.list({
      ownerUserId: req.user.sub,
      driverId: query.driverId,
      plate: query.plate,
      client: query.client,
      tollStatus: query.tollStatus,
      paymentStatus: query.paymentStatus,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      dateField: query.dateField,
    });
  }

  @Get('driver-context/:driverId')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({ summary: 'Buscar contexto do motorista (placa, RNTRC, PIX)' })
  @ApiOkResponse({ description: 'Contexto do motorista, com veículo vinculado quando houver.' })
  @ApiNotFoundResponse({ description: 'Motorista não encontrado.' })
  driverContext(
    @Req() req: AuthenticatedRequest,
    @Param('driverId', ParseUUIDPipe) driverId: string,
  ) {
    return this.service.getDriverContext(driverId, req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar pagamento de motorista' })
  @ApiOkResponse({ description: 'Pagamento encontrado.' })
  @ApiNotFoundResponse({ description: 'Pagamento não encontrado.' })
  findById(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id, req.user.sub);
  }

  @Post()
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: 'Criar pagamento de motorista' })
  @ApiCreatedResponse({ description: 'Pagamento criado, com INSS, SEST/SENAT e pedágio já deduzidos do total.' })
  @ApiBadRequestResponse({ description: 'Valores inválidos.' })
  @ApiNotFoundResponse({ description: 'Motorista não encontrado.' })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateDriverPaymentDto) {
    return this.service.create(dto, req.user.sub);
  }

  @Patch(':id')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: 'Editar pagamento de motorista' })
  @ApiOkResponse({ description: 'Pagamento atualizado.' })
  @ApiBadRequestResponse({ description: 'Valores inválidos.' })
  @ApiNotFoundResponse({ description: 'Pagamento não encontrado.' })
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDriverPaymentDto,
  ) {
    return this.service.update(id, dto, req.user.sub, req.user.sub);
  }

  @Patch(':id/pay')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Marcar pagamento como pago' })
  @ApiOkResponse({ description: 'Pagamento marcado como pago.' })
  @ApiNotFoundResponse({ description: 'Pagamento não encontrado.' })
  pay(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.markPaid(id, req.user.sub, req.user.sub);
  }

  @Delete(':id')
  @HttpCode(204)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Excluir pagamento de motorista' })
  @ApiNoContentResponse({ description: 'Pagamento excluído.' })
  @ApiNotFoundResponse({ description: 'Pagamento não encontrado.' })
  async remove(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id, req.user.sub, req.user.sub);
  }
}
