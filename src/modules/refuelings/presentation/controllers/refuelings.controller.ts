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

@ApiTags('Abastecimentos')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
@ApiForbiddenResponse({ description: 'Lançamento pertence a outro motorista, ou o usuário não está vinculado a um motorista.' })
@Controller('refuelings')
@UseGuards(JwtAuthGuard, RolesGuard)
// O papel só libera a rota; o recorte por motorista é responsabilidade do service.
@Roles('ADMIN', 'DRIVER')
export class RefuelingsController {
  constructor(@Inject(RefuelingsService) private readonly refuelingsService: RefuelingsService) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar abastecimento',
    description:
      'ADMIN precisa informar o `driverId`. Para motorista o campo é ignorado: o lançamento é sempre gravado no nome de quem está autenticado.',
  })
  @ApiCreatedResponse({ description: 'Abastecimento registrado.' })
  @ApiBadRequestResponse({ description: 'Dados inválidos, ou ADMIN sem informar o motorista.' })
  @ApiNotFoundResponse({ description: 'Veículo informado não existe.' })
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateRefuelingDto) {
    return this.refuelingsService.create(dto, actorOf(req));
  }

  @Get()
  @ApiOperation({
    summary: 'Listar abastecimentos',
    description:
      'Ordenados do mais recente para o mais antigo. ADMIN vê a frota inteira; motorista vê apenas os próprios lançamentos, mesmo informando o `driverId` de outro.',
  })
  @ApiQuery({ name: 'truckId', required: false, description: 'Filtra por veículo' })
  @ApiQuery({ name: 'driverId', required: false, description: 'Filtra por motorista (ignorado para motorista)' })
  @ApiQuery({ name: 'from', required: false, description: 'Data inicial em ISO 8601' })
  @ApiQuery({ name: 'to', required: false, description: 'Data final em ISO 8601' })
  @ApiOkResponse({ description: 'Lista de lançamentos.' })
  async list(@Req() req: AuthenticatedRequest, @Query() query: ListRefuelingsQuery) {
    return this.refuelingsService.list(query, actorOf(req));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar abastecimento' })
  @ApiOkResponse({ description: 'Abastecimento encontrado.' })
  @ApiNotFoundResponse({ description: 'Abastecimento não encontrado.' })
  async findById(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.refuelingsService.findById(id, actorOf(req));
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Editar abastecimento',
    description: 'Edição parcial. Motorista só edita o próprio lançamento e não consegue transferi-lo para outro.',
  })
  @ApiOkResponse({ description: 'Abastecimento atualizado.' })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  @ApiNotFoundResponse({ description: 'Abastecimento ou veículo não encontrado.' })
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
  @ApiNoContentResponse({ description: 'Abastecimento removido.' })
  @ApiNotFoundResponse({ description: 'Abastecimento não encontrado.' })
  async remove(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    await this.refuelingsService.remove(id, actorOf(req));
  }
}
