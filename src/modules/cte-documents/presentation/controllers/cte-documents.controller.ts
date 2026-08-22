import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { CteDocumentsService } from '@cte-documents/application/services/cte-documents.service';
import { ListarCteQuery } from '@cte-documents/presentation/dtos/listar-cte.query';
import { VincularCteDto } from '@cte-documents/presentation/dtos/vincular-cte.dto';

@ApiTags('CT-e')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
@Controller('cte/documentos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class CteDocumentsController {
  constructor(
    @Inject(CteDocumentsService) private readonly documentsService: CteDocumentsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Listar CT-e guardados',
    description:
      'Lista os CT-e já importados, do mais recente para o mais antigo pela data de emissão.',
  })
  @ApiOkResponse({ description: 'Lista de CT-e.' })
  async listar(@Req() req: AuthenticatedRequest, @Query() query: ListarCteQuery) {
    return this.documentsService.listar({
      ownerUserId: req.user.sub,
      truckId: query.truckId,
      driverId: query.driverId,
      freightId: query.freightId,
      situacao: query.situacao,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
  }

  @Get(':chave/dacte')
  @ApiOperation({
    summary: 'Baixar DACTE (PDF) do CT-e',
    description:
      'Gera e retorna o PDF do DACTE (Documento Auxiliar do CT-e) com todos os dados do CT-e emitido ou importado.',
  })
  @ApiParam({ name: 'chave', example: '35260808789863000100570010000011471000000001' })
  @ApiOkResponse({ description: 'PDF do DACTE gerado.' })
  @ApiNotFoundResponse({ description: 'CT-e não encontrado.' })
  async baixarDacte(
    @Req() req: AuthenticatedRequest,
    @Param('chave') chave: string,
    @Res() res: any,
  ) {
    const pdf = await this.documentsService.gerarDacte(chave, req.user.sub);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="DACTE-${chave}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }

  @Get(':chave/xml')
  @ApiOperation({
    summary: 'Baixar XML do CT-e',
    description:
      'Retorna o XML autorizado (cteProc) do CT-e emitido ou importado.',
  })
  @ApiParam({ name: 'chave', example: '35260808789863000100570010000011471000000001' })
  @ApiOkResponse({ description: 'XML do CT-e.' })
  @ApiNotFoundResponse({ description: 'CT-e não encontrado ou XML não disponível.' })
  async baixarXml(
    @Req() req: AuthenticatedRequest,
    @Param('chave') chave: string,
    @Res() res: any,
  ) {
    const { xml, numero, serie } = await this.documentsService.obterXml(chave, req.user.sub);
    res.set({
      'Content-Type': 'application/xml',
      'Content-Disposition': `attachment; filename="CTe_${numero}_${serie}_${chave}.xml"`,
      'Content-Length': Buffer.byteLength(xml, 'utf-8'),
    });
    res.send(xml);
  }

  @Get(':chave')
  @ApiOperation({ summary: 'Detalhar CT-e guardado' })
  @ApiParam({ name: 'chave', example: '35260808789863000100570010000011471000000001' })
  @ApiOkResponse({ description: 'CT-e encontrado.' })
  @ApiNotFoundResponse({ description: 'CT-e não importado ainda.' })
  async detalhar(@Req() req: AuthenticatedRequest, @Param('chave') chave: string) {
    return this.documentsService.buscarPorChave(chave, req.user.sub);
  }
@Patch(':chave/vinculos')
  @ApiOperation({
    summary: 'Vincular CT-e a veículo, motorista ou frete',
    description:
      'Enviar `null` em um campo desfaz o vínculo; omitir o campo mantém o que já estava.',
  })
  @ApiOkResponse({ description: 'Vínculos atualizados.' })
  @ApiBadRequestResponse({ description: 'Identificador em formato inválido.' })
  @ApiNotFoundResponse({ description: 'CT-e não importado ainda.' })
  async vincular(
    @Req() req: AuthenticatedRequest,
    @Param('chave') chave: string,
    @Body() dto: VincularCteDto,
  ) {
    return this.documentsService.vincular(chave, dto, req.user.sub);
  }

  @Delete(':chave')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remover CT-e guardado' })
  @ApiNoContentResponse({ description: 'CT-e removido.' })
  @ApiNotFoundResponse({ description: 'CT-e não importado ainda.' })
  async remover(@Req() req: AuthenticatedRequest, @Param('chave') chave: string) {
    await this.documentsService.remover(chave, req.user.sub);
  }
}
