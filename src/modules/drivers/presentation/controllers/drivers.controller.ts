import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { createReadStream } from 'fs';
import { join } from 'path';
import type { Response } from 'express';
import { Roles } from '@common/decorators/roles.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { AuthenticatedRequest } from '@common/interfaces/authenticated-request.interface';
import { DriverStatus } from '@database/typeorm/entities/enums';
import { DriversService } from '@applications/drivers/application/services/drivers.service';
import {
  CNH_UPLOADS_DIR,
  cnhImageUploadOptions,
  mimeTypeFromPath,
} from '@drivers/infrastructure/storage/cnh-image-storage';
import { CreateDriverDto } from '@drivers/presentation/dtos/create-driver.dto';
import { DefineDriverAccessDto } from '@drivers/presentation/dtos/define-driver-access.dto';
import { UpdateDriverStatusDto } from '@drivers/presentation/dtos/update-driver-status.dto';
import { UpdateDriverDto } from '@drivers/presentation/dtos/update-driver.dto';

@ApiTags('Motoristas')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado.' })
@ApiForbiddenResponse({ description: 'Rota restrita a ADMIN.' })
@Controller('drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class DriversController {
  constructor(@Inject(DriversService) private readonly driversService: DriversService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar motorista' })
  @ApiCreatedResponse({ description: 'Motorista cadastrado com status EM_ANALISE.' })
  @ApiBadRequestResponse({ description: 'CPF, PIS, PIX, CEP ou contatos inválidos.' })
  @ApiConflictResponse({ description: 'Já existe motorista com esse CPF.' })
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateDriverDto) {
    return this.driversService.create(dto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Listar motoristas' })
  @ApiQuery({ name: 'status', required: false, enum: DriverStatus, description: 'Filtra por situação do cadastro' })
  @ApiOkResponse({ description: 'Lista de motoristas.' })
  async list(@Query('status', new ParseEnumPipe(DriverStatus, { optional: true })) status?: DriverStatus) {
    return this.driversService.list(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar motorista' })
  @ApiOkResponse({ description: 'Motorista encontrado.' })
  @ApiNotFoundResponse({ description: 'Motorista não encontrado.' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.driversService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar cadastro do motorista' })
  @ApiOkResponse({ description: 'Cadastro atualizado.' })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  @ApiNotFoundResponse({ description: 'Motorista não encontrado.' })
  @ApiConflictResponse({ description: 'CPF já usado por outro motorista.' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDriverDto,
  ) {
    return this.driversService.update(id, dto, req.user.sub);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Aprovar ou reprovar motorista' })
  @ApiOkResponse({ description: 'Situação atualizada.' })
  @ApiBadRequestResponse({ description: 'Status inválido.' })
  @ApiNotFoundResponse({ description: 'Motorista não encontrado.' })
  async updateStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDriverStatusDto,
  ) {
    return this.driversService.updateStatus(id, dto.status, req.user.sub);
  }

  @Post(':id/access')
  @ApiOperation({ summary: 'Definir e-mail/senha de acesso e aprovar motorista' })
  @ApiOkResponse({ description: 'Acesso criado e motorista aprovado.' })
  @ApiBadRequestResponse({ description: 'E-mail ou senha inválidos.' })
  @ApiNotFoundResponse({ description: 'Motorista não encontrado.' })
  @ApiConflictResponse({ description: 'E-mail já usado por outro usuário.' })
  async defineDriverAccess(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DefineDriverAccessDto,
  ) {
    return this.driversService.defineDriverAccess(id, dto.email, dto.password, req.user.sub);
  }

  @Post(':id/cnh-image')
  // Two multer copies coexist in node_modules (top-level ^2.2.0 per package.json vs the
  // exact 2.0.2 pinned by @nestjs/platform-express), so their FileFilterCallback types are
  // structurally incompatible and MulterOptions isn't publicly exported. Cast is required
  // for tsc; runtime behavior is unaffected.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @UseInterceptors(FileInterceptor('file', cnhImageUploadOptions as any))
  @ApiOperation({ summary: 'Enviar imagem da CNH' })
  @ApiCreatedResponse({ description: 'Imagem armazenada.' })
  @ApiBadRequestResponse({ description: 'Arquivo ausente ou com formato não aceito.' })
  @ApiNotFoundResponse({ description: 'Motorista não encontrado.' })
  async uploadCnhImage(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo de imagem obrigatorio');
    }
    return this.driversService.saveCnhImagePath(id, file.filename, req.user.sub);
  }

  @Get(':id/cnh-image')
  @ApiOperation({ summary: 'Baixar imagem da CNH' })
  @ApiOkResponse({ description: 'Imagem da CNH.' })
  @ApiNotFoundResponse({ description: 'Motorista sem imagem de CNH.' })
  async getCnhImage(@Param('id', ParseUUIDPipe) id: string, @Res({ passthrough: true }) res: Response) {
    const storedFilename = await this.driversService.getCnhImagePath(id);
    const absolutePath = join(CNH_UPLOADS_DIR, storedFilename);
    res.set({ 'Content-Type': mimeTypeFromPath(absolutePath) });
    return new StreamableFile(createReadStream(absolutePath));
  }
}
