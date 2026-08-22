import {
  ForbiddenException,
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
import { DriversService } from '@applications/drivers/application/services/drivers.service';
import { FreightEntity } from '@freights/domain/entities/freight.entity';
import { FreightsService } from '@freights/application/services/freights.service';
import { AlterarStatusDto } from '@freights/presentation/dtos/alterar-status.dto';
import { AtualizarFreteDto } from '@freights/presentation/dtos/atualizar-frete.dto';
import { CriarFreteDoCteDto } from '@freights/presentation/dtos/criar-frete-do-cte.dto';
import { CriarFreteDto } from '@freights/presentation/dtos/criar-frete.dto';
import { ListarFretesQuery } from '@freights/presentation/dtos/listar-fretes.query';

/** Recorte impossível: não casa com nenhum motorista, então a lista volta vazia. */
const SEM_MOTORISTA = '__sem-motorista__';

/** O dono é recorte interno: não sai na resposta. */
const semDono = ({ ownerUserId: _ownerUserId, ...frete }: FreightEntity) => frete;

@ApiTags('Fretes')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
@ApiForbiddenResponse({ description: 'Rota restrita a ADMIN.' })
@Controller('freights')
@UseGuards(JwtAuthGuard, RolesGuard)
// Motorista entra apenas nas rotas marcadas abaixo, e sempre limitado aos
// fretes que são dele; o recorte é feito no controller, não pelo papel.
@Roles('ADMIN')
export class FreightsController {
  constructor(
    @Inject(FreightsService) private readonly freightsService: FreightsService,
    @Inject(DriversService) private readonly driversService: DriversService,
  ) {}

  /** ADMIN vê a própria carteira; motorista vê a do gestor a que pertence. */
  private escopo(req: AuthenticatedRequest): Promise<string> {
    return this.freightsService.escopoDe({ userId: req.user.sub, role: req.user.role });
  }

  /**
   * Motorista só enxerga frete atribuído a ele, mesmo pedindo o de outro.
   * Sem vínculo com motorista nenhum, a lista volta vazia.
   */
  private async recorteDeMotorista(
    req: AuthenticatedRequest,
    driverIdPedido?: string,
  ): Promise<string | undefined> {
    if (req.user.role === 'ADMIN') {
      return driverIdPedido;
    }

    return (await this.driversService.findIdByUserId(req.user.sub)) ?? SEM_MOTORISTA;
  }

  /** Frete de outro motorista não é dele para ver nem para mexer. */
  private async assertMotoristaDoFrete(
    req: AuthenticatedRequest,
    driverIdDoFrete: string | null,
  ): Promise<void> {
    if (req.user.role === 'ADMIN') {
      return;
    }

    const driverId = await this.driversService.findIdByUserId(req.user.sub);

    if (!driverId || driverIdDoFrete !== driverId) {
      throw new ForbiddenException('Este frete está atribuído a outro motorista.');
    }
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
    return semDono(await this.freightsService.criarDoCte(chave, dto, await this.escopo(req)));
  }

  @Post()
  @ApiOperation({
    summary: 'Criar frete avulso',
    description: 'Para o frete que ainda não tem CT-e emitido. O código é gerado se omitido.',
  })
  @ApiCreatedResponse({ description: 'Frete criado.' })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  async criar(@Req() req: AuthenticatedRequest, @Body() dto: CriarFreteDto) {
    return semDono(await this.freightsService.criar(dto, await this.escopo(req)));
  }

  @Get()
  @Roles('ADMIN', 'DRIVER')
  @ApiOperation({
    summary: 'Listar fretes',
    description:
      'Do mais recente para o mais antigo. Motorista recebe apenas os fretes atribuídos a ele, mesmo informando o `driverId` de outro.',
  })
  @ApiOkResponse({ description: 'Lista de fretes.' })
  async listar(@Req() req: AuthenticatedRequest, @Query() query: ListarFretesQuery) {
    const fretes = await this.freightsService.listar({
      ownerUserId: await this.escopo(req),
      status: query.status,
      truckId: query.truckId,
      driverId: await this.recorteDeMotorista(req, query.driverId),
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });

    return fretes.map(semDono);
  }

  @Get(':id')
  @Roles('ADMIN', 'DRIVER')
  @ApiOperation({ summary: 'Detalhar frete' })
  @ApiOkResponse({ description: 'Frete encontrado.' })
  @ApiNotFoundResponse({ description: 'Frete não encontrado.' })
  async detalhar(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    const frete = await this.freightsService.buscar(id, await this.escopo(req));
    await this.assertMotoristaDoFrete(req, frete.driverId);

    return semDono(frete);
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
    return semDono(await this.freightsService.atualizar(id, dto, await this.escopo(req)));
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'DRIVER')
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
    const escopo = await this.escopo(req);
    const frete = await this.freightsService.buscar(id, escopo);
    await this.assertMotoristaDoFrete(req, frete.driverId);

    // Quem mudou o status assina o evento na timeline do frete.
    return semDono(
      await this.freightsService.alterarStatus(id, dto.status, req.user.sub, escopo),
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
