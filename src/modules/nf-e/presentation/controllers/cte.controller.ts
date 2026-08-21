import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
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
import { ImportarXmlDto } from '@nf-e/presentation/dtos/importar-xml.dto';
import { ValidarCodigoDto } from '@nf-e/presentation/dtos/validar-codigo.dto';

@ApiTags('CT-e')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
@Controller('cte')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'DRIVER')
export class CteController {
  constructor(@Inject(NfeService) private readonly nfeService: NfeService) {}

  @Get('qr/:chave')
  @ApiOperation({
    summary: 'Consulta CT-e pela chave de acesso',
    description:
      'Aceita chave de CT-e (modelo 57) ou CT-e OS (modelo 67), lida do QR Code ou do código de barras do DACTE. Valida o dígito verificador e devolve os dados da chave; o bloco `sefaz` traz a situação quando há certificado configurado.',
  })
  @ApiParam({
    name: 'chave',
    example: '35260808789863000100570010000011471000000001',
    description: 'Chave de acesso do CT-e, 44 dígitos',
  })
  @ApiOkResponse({ type: ConsultaNfeResponseDto })
  @ApiBadRequestResponse({
    description: 'Chave inválida, ou chave de NF-e enviada para a rota de CT-e.',
  })
  async consultarPorChave(@Param('chave') chave: string) {
    return this.nfeService.consultarPorChave(chave, 'CTE');
  }

  @Post('validar')
  @ApiOperation({
    summary: 'Valida QR Code ou código de barras do DACTE',
    description:
      'Aceita a chave crua de 44 dígitos (código de barras do DACTE), a URL do QR Code do CT-e (`?chCTe=...`) ou o conteúdo lido pelo leitor. Recusa chave que não seja de CT-e.',
  })
  @ApiOkResponse({ type: ValidacaoCodigoResponseDto })
  @ApiBadRequestResponse({
    description: 'Conteúdo sem chave válida, ou chave que não é de CT-e.',
  })
  async validar(@Body() dto: ValidarCodigoDto) {
    return this.nfeService.validarCodigo(dto, 'CTE');
  }

  @Post('importar-xml')
  @ApiOperation({
    summary: 'Importar XML do CT-e',
    description:
      'Recebe o XML do CT-e e devolve o conteúdo estruturado: emitente, remetente, destinatário, trajeto, componentes do valor, carga, NF-e transportadas, RNTRC e protocolo de autorização. É o único caminho para esses dados — a consulta de protocolo na SEFAZ devolve apenas a situação do documento.',
  })
  @ApiOkResponse({ description: 'CT-e interpretado.' })
  @ApiBadRequestResponse({
    description: 'XML malformado, sem elemento infCte ou com chave de acesso inválida.',
  })
  importarXml(@Body() dto: ImportarXmlDto) {
    return this.nfeService.importarCteXml(dto.xml);
  }
}
