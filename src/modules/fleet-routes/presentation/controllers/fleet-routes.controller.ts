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
import { FleetRoutesService } from '@applications/fleet-routes/application/services/fleet-routes.service';
import { CreateFleetRouteDto } from '@applications/fleet-routes/presentation/dtos/create-fleet-route.dto';
import { ListFleetRoutesQuery } from '@applications/fleet-routes/presentation/dtos/list-fleet-routes.query';
import { UpdateFleetRouteDto } from '@applications/fleet-routes/presentation/dtos/update-fleet-route.dto';

@ApiTags('Rotas')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
@ApiForbiddenResponse({ description: 'Rota restrita a ADMIN.' })
// Cada gestor só enxerga os próprios cadastros: o recorte é feito no service pelo dono.
@Controller('fleet-routes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class FleetRoutesController {
  constructor(@Inject(FleetRoutesService) private readonly service: FleetRoutesService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar rota' })
  @ApiCreatedResponse({ description: 'Rota cadastrado.' })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateFleetRouteDto) {
    return this.service.create(dto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Listar rotas', description: 'Ordenado por nome.' })
  @ApiQuery({ name: 'search', required: false, description: 'Busca livre por nome' })
  @ApiOkResponse({ description: 'Lista de rotas.' })
  async list(@Req() req: AuthenticatedRequest, @Query() query: ListFleetRoutesQuery) {
    return this.service.list(query, req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar rota' })
  @ApiOkResponse({ description: 'Rota encontrado.' })
  @ApiNotFoundResponse({ description: 'Rota não encontrado.' })
  async findById(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar rota', description: 'Edição parcial.' })
  @ApiOkResponse({ description: 'Rota atualizado.' })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  @ApiNotFoundResponse({ description: 'Rota não encontrado.' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFleetRouteDto,
  ) {
    return this.service.update(id, dto, req.user.sub);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remover rota' })
  @ApiNoContentResponse({ description: 'Rota removido.' })
  @ApiNotFoundResponse({ description: 'Rota não encontrado.' })
  async remove(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id, req.user.sub);
  }
}
