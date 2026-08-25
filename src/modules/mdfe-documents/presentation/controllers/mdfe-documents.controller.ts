import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
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
import { MdfeDocumentsService } from '@mdfe-documents/application/services/mdfe-documents.service';
import { EmitirMdfeDto } from '@mdfe-documents/presentation/dtos/emitir-mdfe.dto';
import { EncerrarMdfeDto } from '@mdfe-documents/presentation/dtos/encerrar-mdfe.dto';
import { ListarMdfeQuery } from '@mdfe-documents/presentation/dtos/listar-mdfe.query';

@ApiTags('MDF-e')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
@Controller('mdfe')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class MdfeDocumentsController {
  constructor(
    @Inject(MdfeDocumentsService) private readonly service: MdfeDocumentsService,
  ) {}

  @Post('emitir')
  @ApiOperation({
    summary: 'Emitir MDF-e reunindo os CT-e da viagem',
    description:
      'Gera o XML do MDF-e 3.00 com os dados do veículo e do motorista, assina com o certificado A1 ' +
      'e transmite ao Ambiente Nacional. Só entra CT-e autorizado; autorizado, guarda o documento com ' +
      'o protocolo. Rejeitado, devolve o código e o motivo da SEFAZ sem gravar como válido.',
  })
  @ApiCreatedResponse({ description: 'MDF-e transmitido. Ver o campo autorizado no retorno.' })
  @ApiBadRequestResponse({ description: 'CT-e não autorizado, de outro gestor, ou dados insuficientes.' })
  async emitir(@Req() req: AuthenticatedRequest, @Body() dto: EmitirMdfeDto) {
    const { resultado, documento } = await this.service.emitir(dto, req.user.sub);
    return { ...resultado, documento };
  }

  @Post(':chave/encerrar')
  @ApiOperation({
    summary: 'Encerrar o MDF-e ao fim da viagem',
    description:
      'Transmite o evento de encerramento (110112) à SEFAZ com o município de descarga real. ' +
      'Só encerra MDF-e autorizado e ainda não encerrado.',
  })
  @ApiParam({ name: 'chave', example: '35260808789863000100580010000000151123456781' })
  @ApiOkResponse({ description: 'MDF-e encerrado.' })
  @ApiBadRequestResponse({ description: 'MDF-e não autorizado, já encerrado, ou rejeitado pela SEFAZ.' })
  @ApiNotFoundResponse({ description: 'MDF-e não encontrado.' })
  async encerrar(
    @Req() req: AuthenticatedRequest,
    @Param('chave') chave: string,
    @Body() dto: EncerrarMdfeDto,
  ) {
    return this.service.encerrar(chave, dto, req.user.sub);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar MDF-e emitidos',
    description: 'Do mais recente para o mais antigo pela data de emissão.',
  })
  @ApiOkResponse({ description: 'Lista de MDF-e.' })
  async listar(@Req() req: AuthenticatedRequest, @Query() query: ListarMdfeQuery) {
    return this.service.listar({
      ownerUserId: req.user.sub,
      truckId: query.truckId,
      driverId: query.driverId,
      situacao: query.situacao,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
  }

  @Get(':chave')
  @ApiOperation({ summary: 'Detalhar MDF-e, incluindo os CT-e vinculados' })
  @ApiParam({ name: 'chave', example: '35260808789863000100580010000000151123456781' })
  @ApiOkResponse({ description: 'MDF-e encontrado.' })
  @ApiNotFoundResponse({ description: 'MDF-e não encontrado.' })
  async detalhar(@Req() req: AuthenticatedRequest, @Param('chave') chave: string) {
    return this.service.buscarPorChave(chave, req.user.sub);
  }

  @Delete(':chave')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remover MDF-e guardado' })
  @ApiNotFoundResponse({ description: 'MDF-e não encontrado.' })
  async remover(@Req() req: AuthenticatedRequest, @Param('chave') chave: string) {
    await this.service.remover(chave, req.user.sub);
  }
}
