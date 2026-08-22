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
  Req,
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
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
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

  /** ADMIN vê a própria carteira; motorista vê a do gestor a que pertence. */
  private escopo(req: AuthenticatedRequest): Promise<string> {
    return this.freightsService.escopoDe({ userId: req.user.sub, role: req.user.role });
  }

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
  async criarDoCte(
    @Req() req: AuthenticatedRequest,
    @Param('chave') chave: string,
    @Body() dto: CriarFreteDoCteDto,
  ) {
    return this.freightsService.criarDoCte(chave, dto, await this.escopo(req));
  }

  @Post()
  @ApiOperation({
    summary: 'Criar frete avulso',
    description: 'Para o frete que ainda não tem CT-e emitido. O código é gerado se omitido.',
  })
  @ApiCreatedResponse({ description: 'Frete criado.' })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  async criar(@Req() req: AuthenticatedRequest, @Body() dto: CriarFreteDto) {
    return this.freightsService.criar(dto, await this.escopo(req));
  }

  @Get()
  @ApiOperation({ summary: 'Listar fretes', description: 'Do mais recente para o mais antigo.' })
  @ApiOkResponse({ description: 'Lista de fretes.' })
  async listar(@Req() req: AuthenticatedRequest, @Query() query: ListarFretesQuery) {
    return this.freightsService.listar({
      ownerUserId: await this.escopo(req),
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
  async detalhar(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.freightsService.buscar(id, await this.escopo(req));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar frete', description: 'Edição parcial.' })
  @ApiOkResponse({ description: 'Frete atualizado.' })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  @ApiNotFoundResponse({ description: 'Frete não encontrado.' })
  async atualizar(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarFreteDto,
  ) {
    return this.freightsService.atualizar(id, dto, await this.escopo(req));
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
  async alterarStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AlterarStatusDto,
  ) {
    // Quem mudou o status assina o evento na timeline do frete.
    return this.freightsService.alterarStatus(
      id,
      dto.status,
      req.user.sub,
      await this.escopo(req),
    );
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remover frete' })
  @ApiNoContentResponse({ description: 'Frete removido.' })
  @ApiNotFoundResponse({ description: 'Frete não encontrado.' })
  async remover(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    await this.freightsService.remover(id, await this.escopo(req));
  }
}
