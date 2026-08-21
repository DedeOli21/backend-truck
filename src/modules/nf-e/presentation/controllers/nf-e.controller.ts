import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '@common/decorators/roles.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { NfeService } from '@nf-e/application/services/nf-e.service';
import {
  ConsultaNfeResponseDto,
  ValidacaoCodigoResponseDto,
} from '@nf-e/presentation/dtos/consulta-nfe.response';
import { ConsultarPorUfParams } from '@nf-e/presentation/dtos/consultar-por-uf.params';
import { ValidarCodigoDto } from '@nf-e/presentation/dtos/validar-codigo.dto';

@ApiTags('NF-e')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
@Controller('nf-e')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'DRIVER')
export class NfeController {
  constructor(@Inject(NfeService) private readonly nfeService: NfeService) {}

  @Get('qr/:chave')
  @ApiOperation({
    summary: 'Consulta pela chave de acesso',
    description:
      'Recebe a chave de 44 dígitos lida do QR Code ou digitada. Valida o dígito verificador e devolve os dados que a própria chave carrega (UF, emitente, modelo, série, número). O bloco `sefaz` indica se a situação do documento chegou a ser consultada.',
  })
  @ApiParam({
    name: 'chave',
    example: '35260811222333000181550010000010421123456780',
    description: 'Chave de acesso de 44 dígitos',
  })
  @ApiOkResponse({ type: ConsultaNfeResponseDto })
  @ApiBadRequestResponse({
    description: 'Chave com tamanho, dígito verificador, UF, CNPJ ou modelo inválido.',
  })
  async consultarPorChave(@Param('chave') chave: string) {
    return this.nfeService.consultarPorChave(chave, 'NFE');
  }

  // Declarada depois de 'qr/:chave': o Nest casa as rotas na ordem de
  // declaração, e esta captura qualquer /nf-e/<algo>/<algo>.
  @Get(':uf/:numero')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Consulta básica por UF e número',
    description:
      'Consulta uma nota pelo número, dentro de uma UF. A SEFAZ não expõe busca por UF + número — o webservice exige a chave de acesso completa —, então esta rota depende de uma integração que resolva o número para a chave. Sem essa integração configurada, responde 503.',
  })
  @ApiParam({ name: 'uf', example: 'SP', description: 'Sigla da UF do emitente' })
  @ApiParam({ name: 'numero', example: 1042, description: 'Número da nota fiscal' })
  @ApiOkResponse({ type: ConsultaNfeResponseDto })
  @ApiBadRequestResponse({ description: 'UF ou número inválido.' })
  @ApiServiceUnavailableResponse({
    description: 'Integração com a SEFAZ não configurada (requer certificado digital A1/A3).',
  })
  async consultarPorUfNumero(@Param() params: ConsultarPorUfParams) {
    return this.nfeService.consultarPorUfNumero(params.uf, params.numero);
  }

  @Post('validar')
  @ApiOperation({
    summary: 'Valida QR Code ou código de barras',
    description:
      'Aceita a chave crua de 44 dígitos (código de barras do DANFE), a URL do QR Code da NFC-e (`?p=chave|...`) ou a URL do portal nacional (`?chNFe=...`). Extrai e valida a chave, devolvendo os dados do documento.',
  })
  @ApiOkResponse({ type: ValidacaoCodigoResponseDto })
  @ApiBadRequestResponse({
    description: 'Conteúdo vazio, sem chave de 44 dígitos ou com chave inválida.',
  })
  async validar(@Body() dto: ValidarCodigoDto) {
    return this.nfeService.validarCodigo(dto, 'NFE');
  }
}
