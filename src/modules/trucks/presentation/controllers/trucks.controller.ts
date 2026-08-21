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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@common/decorators/roles.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { TruckStatus } from '@database/typeorm/entities/enums';
import { TrucksService } from '@trucks/application/services/trucks.service';
import { CreateTruckDto } from '@trucks/presentation/dtos/create-truck.dto';
import { UpdateTruckDto } from '@trucks/presentation/dtos/update-truck.dto';

@ApiTags('Trucks')
@ApiBearerAuth('access-token')
@Controller('trucks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class TrucksController {
  constructor(@Inject(TrucksService) private readonly trucksService: TrucksService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar veículo' })
  async create(@Body() dto: CreateTruckDto) {
    return this.trucksService.create(dto);
  }

  @Get()
  @Roles('ADMIN', 'DRIVER')
  @ApiOperation({ summary: 'Listar veículos' })
  async list(
    @Query('status', new ParseEnumPipe(TruckStatus, { optional: true })) status?: TruckStatus,
  ) {
    return this.trucksService.list(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar veículo' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.trucksService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar veículo' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTruckDto) {
    return this.trucksService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remover veículo' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.trucksService.remove(id);
  }
}
