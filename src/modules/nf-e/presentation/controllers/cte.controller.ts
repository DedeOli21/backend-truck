import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
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
import { NfeService } from '@nf-e/application/services/nf-e.service';
import {
  ConsultaNfeResponseDto,
  ValidacaoCodigoResponseDto,
} from '@nf-e/presentation/dtos/consulta-nfe.response';
import { EmissaoCteService } from '@nf-e/application/services/emissao-cte.service';
import { EmitirCteDto } from '@nf-e/presentation/dtos/emitir-cte.dto';
import { ImportarXmlDto } from '@nf-e/presentation/dtos/importar-xml.dto';
import { ValidarCodigoDto } from '@nf-e/presentation/dtos/validar-codigo.dto';

@ApiTags('CT-e')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
@Controller('cte')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'DRIVER')
export class CteController {
  constructor(
    @Inject(NfeService) private readonly nfeService: NfeService,
    @Inject(CteDocumentsService) private readonly documentsService: CteDocumentsService,
    @Inject(EmissaoCteService) private readonly emissaoService: EmissaoCteService,
  ) {}

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

  @Post('emitir')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Emitir CT-e a partir da NF-e',
    description:
      'Gera o XML do CT-e 4.00 com os dados da NF-e transportada, assina com o certificado A1 e transmite à SEFAZ. Autorizado, guarda o documento com o protocolo e vincula veículo e motorista; rejeitado, devolve o código e o motivo da SEFAZ sem gravar como válido. O ambiente padrão é homologação, que não tem valor fiscal.',
  })
  @ApiCreatedResponse({ description: 'CT-e transmitido. Ver o campo autorizado no retorno.' })
  @ApiBadRequestResponse({
    description: 'NF-e inválida, cancelada, ou dados insuficientes para montar o CT-e.',
  })
  async emitir(@Req() req: AuthenticatedRequest, @Body() dto: EmitirCteDto) {
    const resultado = await this.emissaoService.emitir(dto);

    if (resultado.autorizado) {
      const salvo = await this.documentsService.salvarEmitido({
        ownerUserId: req.user.sub,
        chave: resultado.chave,
        ambiente: resultado.ambiente,
        protocolo: resultado.protocolo,
        autorizadoEm: resultado.autorizadoEm,
        xml: resultado.xml,
        notasFiscais: [resultado.nfeTransportada],
        truckId: dto.truckId ?? null,
        driverId: dto.driverId ?? null,
        valorTotalServico: dto.valorFrete,
      });

      return { ...resultado, documento: salvo };
    }

    return resultado;
  }

  @Post('importar-chave')
  @ApiOperation({
    summary: 'Registrar CT-e pela chave lida',
    description:
      'Para o fluxo do leitor de QR Code e código de barras: grava o CT-e com o que a chave carrega e a situação consultada na SEFAZ. O conteúdo completo entra depois, ao importar o XML ou o PDF.',
  })
  @ApiOkResponse({ description: 'CT-e registrado.' })
  @ApiBadRequestResponse({ description: 'Conteúdo sem chave de CT-e válida.' })
  async importarChave(@Req() req: AuthenticatedRequest, @Body() dto: ValidarCodigoDto) {
    const leitura = await this.nfeService.validarCodigo(dto, 'CTE');
    const salvo = await this.documentsService.salvarDaChave(
      leitura.documento.chave,
      req.user.sub,
      leitura.sefaz.situacao,
    );

    return { ...salvo, origem: leitura.origem, sefaz: leitura.sefaz };
  }

  @Post('importar-xml')
  @ApiOperation({
    summary: 'Importar XML do CT-e',
    description:
      'Recebe o XML do CT-e e devolve o conteúdo estruturado: emitente, remetente, destinatário, trajeto, componentes do valor, carga, NF-e transportadas, RNTRC e protocolo de autorização. É o único caminho para esses dados — a consulta de protocolo na SEFAZ devolve apenas a situação do documento.',
  })
  @ApiOkResponse({ description: 'CT-e interpretado e guardado.' })
  @ApiBadRequestResponse({
    description: 'XML malformado, sem elemento infCte ou com chave de acesso inválida.',
  })
  async importarXml(@Req() req: AuthenticatedRequest, @Body() dto: ImportarXmlDto) {
    // Importar já guarda: reimportar a mesma chave atualiza o registro e
    // preserva os vínculos com veículo, motorista e frete.
    return this.documentsService.salvarDoXml(
      this.nfeService.importarCteXml(dto.xml),
      req.user.sub,
    );
  }

  @Post('importar-pdf')
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { arquivo: { type: 'string', format: 'binary', description: 'PDF do DACTE' } },
    },
  })
  @ApiOperation({
    summary: 'Importar PDF do DACTE',
    description:
      'Lê a camada de texto do PDF. A chave de acesso e o que ela carrega (UF, número, série, emitente) valem para qualquer emissor; os demais campos dependem do layout do software emissor e, quando não encontrados, vêm listados em `camposNaoEncontrados`. PDF digitalizado (imagem) é recusado, pois exigiria OCR. Quando há certificado configurado, a situação do documento vem junto no bloco `sefaz`.',
  })
  @ApiOkResponse({ description: 'DACTE interpretado.' })
  @ApiBadRequestResponse({
    description: 'PDF ilegível, sem camada de texto ou sem chave de CT-e válida.',
  })
  async importarPdf(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() arquivo?: Express.Multer.File,
  ) {
    if (!arquivo) {
      throw new BadRequestException('Envie o PDF no campo "arquivo".');
    }

    const extraido = await this.nfeService.importarDactePdf(arquivo.buffer);
    const salvo = await this.documentsService.salvarDoPdf(
      extraido,
      req.user.sub,
      extraido.sefaz.situacao,
    );

    return { ...salvo, camposNaoEncontrados: extraido.camposNaoEncontrados, sefaz: extraido.sefaz };
  }
}
