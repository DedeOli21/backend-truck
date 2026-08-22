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
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '@common/decorators/roles.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { FreightsService } from '@freights/application/services/freights.service';
import { AlterarStatusDto } from '@freights/presentation/dtos/alterar-status.dto';
import { AtualizarFreteDto } from '@freights/presentation/dtos/atualizar-frete.dto';
import { CriarFreteDoCteDto } from '@freights/presentation/dtos/criar-frete-do-cte.dto';
import { CriarFreteDto } from '@freights/presentation/dtos/criar-frete.dto';
import { ListarFretesQuery } from '@freights/presentation/dtos/listar-fretes.query';

@ApiTags('Fretes')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
@ApiForbiddenResponse({ description: 'Rota restrita a ADMIN.' })
@Controller('freights')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class FreightsController {
  constructor(@Inject(FreightsService) private readonly freightsService: FreightsService) {}

  @Post('from-cte/:chave')
  @ApiOperation({
    summary: 'Criar frete a partir de um CT-e',
    description:
      'Cria o frete herdando rota, cliente, carga e valor do CT-e importado, e deixa o documento vinculado ao frete. Veículo e motorista podem ser informados aqui; se omitidos, usa os que já estiverem no CT-e.',
  })
  @ApiParam({ name: 'chave', example: '35260808789863000100570010000011471000000001' })
  @ApiCreatedResponse({ description: 'Frete criado e CT-e vinculado.' })
  @ApiBadRequestResponse({ description: 'CT-e cancelado ou denegado não vira frete.' })
  @ApiNotFoundResponse({ description: 'CT-e não importado ainda.' })
  @ApiConflictResponse({ description: 'Este CT-e já pertence a um frete.' })
  async criarDoCte(@Param('chave') chave: string, @Body() dto: CriarFreteDoCteDto) {
    return this.freightsService.criarDoCte(chave, dto);
  }

  @Post()
  @ApiOperation({
    summary: 'Criar frete avulso',
    description: 'Para o frete que ainda não tem CT-e emitido. O código é gerado se omitido.',
  })
  @ApiCreatedResponse({ description: 'Frete criado.' })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  async criar(@Body() dto: CriarFreteDto) {
    return this.freightsService.criar(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar fretes', description: 'Do mais recente para o mais antigo.' })
  @ApiOkResponse({ description: 'Lista de fretes.' })
  async listar(@Query() query: ListarFretesQuery) {
    return this.freightsService.listar({
      status: query.status,
      truckId: query.truckId,
      driverId: query.driverId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar frete' })
  @ApiOkResponse({ description: 'Frete encontrado.' })
  @ApiNotFoundResponse({ description: 'Frete não encontrado.' })
  async detalhar(@Param('id', ParseUUIDPipe) id: string) {
    return this.freightsService.buscar(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar frete', description: 'Edição parcial.' })
  @ApiOkResponse({ description: 'Frete atualizado.' })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  @ApiNotFoundResponse({ description: 'Frete não encontrado.' })
  async atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarFreteDto) {
    return this.freightsService.atualizar(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Alterar situação do frete',
    description:
      'Colocar em trânsito exige motorista e veículo definidos. Frete cancelado não muda mais de situação. Concluir carimba a data de conclusão.',
  })
  @ApiOkResponse({ description: 'Situação alterada.' })
  @ApiBadRequestResponse({ description: 'Transição não permitida.' })
  @ApiNotFoundResponse({ description: 'Frete não encontrado.' })
  async alterarStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AlterarStatusDto) {
    return this.freightsService.alterarStatus(id, dto.status);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remover frete' })
  @ApiNoContentResponse({ description: 'Frete removido.' })
  @ApiNotFoundResponse({ description: 'Frete não encontrado.' })
  async remover(@Param('id', ParseUUIDPipe) id: string) {
    await this.freightsService.remover(id);
  }
}
