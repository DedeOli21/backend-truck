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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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

@ApiTags('VehicleExpenses')
@ApiBearerAuth('access-token')
@Controller('vehicle-expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
// O papel só libera a rota; o recorte por motorista é responsabilidade do service.
@Roles('ADMIN', 'DRIVER')
export class VehicleExpensesController {
  constructor(
    @Inject(VehicleExpensesService) private readonly expensesService: VehicleExpensesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Registrar gasto variável' })
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateVehicleExpenseDto) {
    return this.expensesService.create(dto, actorOf(req));
  }

  @Get()
  @ApiOperation({ summary: 'Listar gastos variáveis' })
  async list(@Req() req: AuthenticatedRequest, @Query() query: ListVehicleExpensesQuery) {
    return this.expensesService.list(query, actorOf(req));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar gasto variável' })
  async findById(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.expensesService.findById(id, actorOf(req));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar gasto variável' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleExpenseDto,
  ) {
    return this.expensesService.update(id, dto, actorOf(req));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remover gasto variável' })
  async remove(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    await this.expensesService.remove(id, actorOf(req));
  }
}
