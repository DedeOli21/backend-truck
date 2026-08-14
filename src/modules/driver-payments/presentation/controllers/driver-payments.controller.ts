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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@common/decorators/roles.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { DriverPaymentsService } from '@applications/driver-payments/application/services/driver-payments.service';
import { CreateDriverPaymentDto } from '@driver-payments/presentation/dtos/create-driver-payment.dto';
import { UpdateDriverPaymentDto } from '@driver-payments/presentation/dtos/update-driver-payment.dto';
import { ListDriverPaymentsQueryDto } from '@driver-payments/presentation/dtos/list-driver-payments-query.dto';

@ApiTags('Driver Payments')
@ApiBearerAuth('access-token')
@Controller('driver-payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class DriverPaymentsController {
  constructor(@Inject(DriverPaymentsService) private readonly service: DriverPaymentsService) {}

  @Get()
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: 'Listar pagamentos de motoristas' })
  list(@Query() query: ListDriverPaymentsQueryDto) {
    return this.service.list({
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
  driverContext(@Param('driverId', ParseUUIDPipe) driverId: string) {
    return this.service.getDriverContext(driverId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar pagamento de motorista' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: 'Criar pagamento de motorista' })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateDriverPaymentDto) {
    return this.service.create(dto, req.user.sub);
  }

  @Patch(':id')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: 'Editar pagamento de motorista' })
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDriverPaymentDto,
  ) {
    return this.service.update(id, dto, req.user.sub);
  }

  @Patch(':id/pay')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Marcar pagamento como pago' })
  pay(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.markPaid(id, req.user.sub);
  }

  @Delete(':id')
  @HttpCode(204)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Excluir pagamento de motorista' })
  async remove(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id, req.user.sub);
  }
}
