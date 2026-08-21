import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
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
import { TruckStatus } from '@database/typeorm/entities/enums';
import { TrucksService } from '@trucks/application/services/trucks.service';
import { CreateTruckDto } from '@trucks/presentation/dtos/create-truck.dto';
import { UpdateTruckDto } from '@trucks/presentation/dtos/update-truck.dto';

@ApiTags('Veículos')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
@ApiForbiddenResponse({ description: 'Papel do usuário não permite esta operação.' })
@Controller('trucks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class TrucksController {
  constructor(@Inject(TrucksService) private readonly trucksService: TrucksService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar veículo', description: 'A placa é normalizada (maiúsculas, sem espaço ou hífen) e precisa ser única.' })
  @ApiCreatedResponse({ description: 'Veículo cadastrado.' })
  @ApiBadRequestResponse({ description: 'Dados inválidos: placa fora do formato, tipo ou status desconhecido, capacidade não positiva.' })
  @ApiConflictResponse({ description: 'Já existe um veículo com essa placa.' })
  async create(@Body() dto: CreateTruckDto) {
    return this.trucksService.create(dto);
  }

  @Get()
  @Roles('ADMIN', 'DRIVER')
  @ApiOperation({ summary: 'Listar veículos', description: 'Ordenados por placa. Liberado também para motoristas, que precisam escolher o veículo ao lançar abastecimento.' })
  @ApiQuery({ name: 'status', required: false, enum: TruckStatus, description: 'Filtra por situação do veículo' })
  @ApiOkResponse({ description: 'Lista de veículos.' })
  async list(
    @Query('status', new ParseEnumPipe(TruckStatus, { optional: true })) status?: TruckStatus,
  ) {
    return this.trucksService.list(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar veículo' })
  @ApiOkResponse({ description: 'Veículo encontrado.' })
  @ApiNotFoundResponse({ description: 'Veículo não encontrado.' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.trucksService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar veículo', description: 'Edição parcial: apenas os campos enviados são alterados.' })
  @ApiOkResponse({ description: 'Veículo atualizado.' })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  @ApiNotFoundResponse({ description: 'Veículo não encontrado.' })
  @ApiConflictResponse({ description: 'Placa já usada por outro veículo.' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTruckDto) {
    return this.trucksService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remover veículo' })
  @ApiNoContentResponse({ description: 'Veículo removido.' })
  @ApiNotFoundResponse({ description: 'Veículo não encontrado.' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.trucksService.remove(id);
  }
}
