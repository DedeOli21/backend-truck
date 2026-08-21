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
import {
  VehicleExpenseActor,
  VehicleExpensesService,
} from '@vehicle-expenses/application/services/vehicle-expenses.service';
import { CreateVehicleExpenseDto } from '@vehicle-expenses/presentation/dtos/create-vehicle-expense.dto';
import { ListVehicleExpensesQuery } from '@vehicle-expenses/presentation/dtos/list-vehicle-expenses.query';
import { UpdateVehicleExpenseDto } from '@vehicle-expenses/presentation/dtos/update-vehicle-expense.dto';

const actorOf = (req: AuthenticatedRequest): VehicleExpenseActor => ({
  userId: req.user.sub,
  role: req.user.role,
});

@ApiTags('Gastos de Veículos')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
@ApiForbiddenResponse({ description: 'Lançamento pertence a outro motorista, ou o usuário não está vinculado a um motorista.' })
@Controller('vehicle-expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
// O papel só libera a rota; o recorte por motorista é responsabilidade do service.
@Roles('ADMIN', 'DRIVER')
export class VehicleExpensesController {
  constructor(
    @Inject(VehicleExpensesService) private readonly expensesService: VehicleExpensesService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar gasto',
    description:
      'ADMIN precisa informar o `driverId`. Para motorista o campo é ignorado: o lançamento é sempre gravado no nome de quem está autenticado.',
  })
  @ApiCreatedResponse({ description: 'Gasto registrado.' })
  @ApiBadRequestResponse({ description: 'Dados inválidos, ou ADMIN sem informar o motorista.' })
  @ApiNotFoundResponse({ description: 'Veículo informado não existe.' })
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateVehicleExpenseDto) {
    return this.expensesService.create(dto, actorOf(req));
  }

  @Get()
  @ApiOperation({
    summary: 'Listar gastos',
    description:
      'Ordenados do mais recente para o mais antigo. ADMIN vê a frota inteira; motorista vê apenas os próprios lançamentos, mesmo informando o `driverId` de outro.',
  })
  @ApiQuery({ name: 'truckId', required: false, description: 'Filtra por veículo' })
  @ApiQuery({ name: 'driverId', required: false, description: 'Filtra por motorista (ignorado para motorista)' })
  @ApiQuery({ name: 'from', required: false, description: 'Data inicial em ISO 8601' })
  @ApiQuery({ name: 'to', required: false, description: 'Data final em ISO 8601' })
  @ApiOkResponse({ description: 'Lista de lançamentos.' })
  async list(@Req() req: AuthenticatedRequest, @Query() query: ListVehicleExpensesQuery) {
    return this.expensesService.list(query, actorOf(req));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar gasto' })
  @ApiOkResponse({ description: 'Gasto encontrado.' })
  @ApiNotFoundResponse({ description: 'Gasto não encontrado.' })
  async findById(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.expensesService.findById(id, actorOf(req));
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Editar gasto',
    description: 'Edição parcial. Motorista só edita o próprio lançamento e não consegue transferi-lo para outro.',
  })
  @ApiOkResponse({ description: 'Gasto atualizado.' })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  @ApiNotFoundResponse({ description: 'Gasto ou veículo não encontrado.' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleExpenseDto,
  ) {
    return this.expensesService.update(id, dto, actorOf(req));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remover gasto' })
  @ApiNoContentResponse({ description: 'Gasto removido.' })
  @ApiNotFoundResponse({ description: 'Gasto não encontrado.' })
  async remove(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    await this.expensesService.remove(id, actorOf(req));
  }
}
