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
  RefuelingActor,
  RefuelingsService,
} from '@refuelings/application/services/refuelings.service';
import { CreateRefuelingDto } from '@refuelings/presentation/dtos/create-refueling.dto';
import { ListRefuelingsQuery } from '@refuelings/presentation/dtos/list-refuelings.query';
import { UpdateRefuelingDto } from '@refuelings/presentation/dtos/update-refueling.dto';

const actorOf = (req: AuthenticatedRequest): RefuelingActor => ({
  userId: req.user.sub,
  role: req.user.role,
});

@ApiTags('Refuelings')
@ApiBearerAuth('access-token')
@Controller('refuelings')
@UseGuards(JwtAuthGuard, RolesGuard)
// O papel só libera a rota; o recorte por motorista é responsabilidade do service.
@Roles('ADMIN', 'DRIVER')
export class RefuelingsController {
  constructor(@Inject(RefuelingsService) private readonly refuelingsService: RefuelingsService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar abastecimento' })
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateRefuelingDto) {
    return this.refuelingsService.create(dto, actorOf(req));
  }

  @Get()
  @ApiOperation({ summary: 'Listar abastecimentos' })
  async list(@Req() req: AuthenticatedRequest, @Query() query: ListRefuelingsQuery) {
    return this.refuelingsService.list(query, actorOf(req));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar abastecimento' })
  async findById(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.refuelingsService.findById(id, actorOf(req));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar abastecimento' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRefuelingDto,
  ) {
    return this.refuelingsService.update(id, dto, actorOf(req));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remover abastecimento' })
  async remove(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    await this.refuelingsService.remove(id, actorOf(req));
  }
}
