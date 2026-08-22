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
import { SuppliersService } from '@applications/suppliers/application/services/suppliers.service';
import { CreateSupplierDto } from '@applications/suppliers/presentation/dtos/create-supplier.dto';
import { ListSuppliersQuery } from '@applications/suppliers/presentation/dtos/list-suppliers.query';
import { UpdateSupplierDto } from '@applications/suppliers/presentation/dtos/update-supplier.dto';

@ApiTags('Fornecedores')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
@ApiForbiddenResponse({ description: 'Rota restrita a ADMIN.' })
// Cada gestor só enxerga os próprios cadastros: o recorte é feito no service pelo dono.
@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class SuppliersController {
  constructor(@Inject(SuppliersService) private readonly service: SuppliersService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar fornecedor' })
  @ApiCreatedResponse({ description: 'Fornecedor cadastrado.' })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateSupplierDto) {
    return this.service.create(dto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Listar fornecedors', description: 'Ordenado por nome.' })
  @ApiQuery({ name: 'search', required: false, description: 'Busca livre por nome' })
  @ApiOkResponse({ description: 'Lista de fornecedors.' })
  async list(@Req() req: AuthenticatedRequest, @Query() query: ListSuppliersQuery) {
    return this.service.list(query, req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar fornecedor' })
  @ApiOkResponse({ description: 'Fornecedor encontrado.' })
  @ApiNotFoundResponse({ description: 'Fornecedor não encontrado.' })
  async findById(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar fornecedor', description: 'Edição parcial.' })
  @ApiOkResponse({ description: 'Fornecedor atualizado.' })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  @ApiNotFoundResponse({ description: 'Fornecedor não encontrado.' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.service.update(id, dto, req.user.sub);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remover fornecedor' })
  @ApiNoContentResponse({ description: 'Fornecedor removido.' })
  @ApiNotFoundResponse({ description: 'Fornecedor não encontrado.' })
  async remove(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id, req.user.sub);
  }
}
