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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
import { UpdateDriverStatusDto } from '@drivers/presentation/dtos/update-driver-status.dto';
import { UpdateDriverDto } from '@drivers/presentation/dtos/update-driver.dto';

@ApiTags('Drivers')
@ApiBearerAuth('access-token')
@Controller('drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class DriversController {
  constructor(@Inject(DriversService) private readonly driversService: DriversService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar motorista' })
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateDriverDto) {
    return this.driversService.create(dto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Listar motoristas' })
  async list(@Query('status', new ParseEnumPipe(DriverStatus, { optional: true })) status?: DriverStatus) {
    return this.driversService.list(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar motorista' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.driversService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar cadastro do motorista' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDriverDto,
  ) {
    return this.driversService.update(id, dto, req.user.sub);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Aprovar ou reprovar motorista' })
  async updateStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDriverStatusDto,
  ) {
    return this.driversService.updateStatus(id, dto.status, req.user.sub);
  }

  @Post(':id/cnh-image')
  // Two multer copies coexist in node_modules (top-level ^2.2.0 per package.json vs the
  // exact 2.0.2 pinned by @nestjs/platform-express), so their FileFilterCallback types are
  // structurally incompatible and MulterOptions isn't publicly exported. Cast is required
  // for tsc; runtime behavior is unaffected.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @UseInterceptors(FileInterceptor('file', cnhImageUploadOptions as any))
  @ApiOperation({ summary: 'Enviar imagem da CNH' })
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
  async getCnhImage(@Param('id', ParseUUIDPipe) id: string, @Res({ passthrough: true }) res: Response) {
    const storedFilename = await this.driversService.getCnhImagePath(id);
    const absolutePath = join(CNH_UPLOADS_DIR, storedFilename);
    res.set({ 'Content-Type': mimeTypeFromPath(absolutePath) });
    return new StreamableFile(createReadStream(absolutePath));
  }
}
