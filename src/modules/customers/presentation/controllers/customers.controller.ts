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
import { CustomersService } from '@applications/customers/application/services/customers.service';
import { CreateCustomerDto } from '@applications/customers/presentation/dtos/create-customer.dto';
import { ListCustomersQuery } from '@applications/customers/presentation/dtos/list-customers.query';
import { UpdateCustomerDto } from '@applications/customers/presentation/dtos/update-customer.dto';

@ApiTags('Clientes')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
@ApiForbiddenResponse({ description: 'Rota restrita a ADMIN.' })
// Cada gestor só enxerga os próprios cadastros: o recorte é feito no service pelo dono.
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class CustomersController {
  constructor(@Inject(CustomersService) private readonly service: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar cliente' })
  @ApiCreatedResponse({ description: 'Cliente cadastrado.' })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateCustomerDto) {
    return this.service.create(dto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Listar clientes', description: 'Ordenado por nome.' })
  @ApiQuery({ name: 'search', required: false, description: 'Busca livre por nome' })
  @ApiOkResponse({ description: 'Lista de clientes.' })
  async list(@Req() req: AuthenticatedRequest, @Query() query: ListCustomersQuery) {
    return this.service.list(query, req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar cliente' })
  @ApiOkResponse({ description: 'Cliente encontrado.' })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado.' })
  async findById(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar cliente', description: 'Edição parcial.' })
  @ApiOkResponse({ description: 'Cliente atualizado.' })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado.' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.service.update(id, dto, req.user.sub);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remover cliente' })
  @ApiNoContentResponse({ description: 'Cliente removido.' })
  @ApiNotFoundResponse({ description: 'Cliente não encontrado.' })
  async remove(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id, req.user.sub);
  }
}
