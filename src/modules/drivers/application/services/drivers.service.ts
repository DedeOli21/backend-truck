import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CnhCategory, DriverAuditAction, DriverStatus, PixKeyType } from '@database/typeorm/entities/enums';
import { AuthService } from '@applications/auth/application/services/auth.service';
import { DriverAuditLogEntity } from '@drivers/domain/entities/driver-audit-log.entity';
import { DriverEntity } from '@drivers/domain/entities/driver.entity';
import { DriverReferenceContactEntity } from '@drivers/domain/entities/driver-reference-contact.entity';
import {
  DRIVER_AUDIT_LOG_REPOSITORY,
  DriverAuditLogRepository,
} from '@drivers/domain/repositories/driver-audit-log.repository';
import {
  DRIVERS_REPOSITORY,
  DriverWithContacts,
  DriversRepository,
} from '@drivers/domain/repositories/drivers.repository';
import { isValidCpf } from '@drivers/domain/validators/cpf.validator';
import { isValidPis } from '@drivers/domain/validators/pis.validator';
import { detectPixKeyType, isValidPixKey } from '@drivers/domain/validators/pix-key.validator';
import { onlyDigits } from '@drivers/domain/validators/only-digits';
import { CreateDriverDto } from '@drivers/presentation/dtos/create-driver.dto';
import { UpdateDriverDto } from '@drivers/presentation/dtos/update-driver.dto';

export interface DriverResponse {
  id: string;
  fullName: string;
  cpf: string;
  pis: string | null;
  address: {
    street: string;
    number: string;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string;
    zip: string;
  };
  cnh: {
    number: string;
    category: CnhCategory;
    expiresAt: string;
    expired: boolean;
    hasImage: boolean;
  };
  pixKeyType: PixKeyType;
  pixKey: string;
  status: DriverStatus;
  hasAccess: boolean;
  approvedByUserId: string | null;
  contacts: Array<{ id: string; name: string; phone: string; relationship: string }>;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class DriversService {
  constructor(
    @Inject(DRIVERS_REPOSITORY) private readonly driversRepository: DriversRepository,
    @Inject(DRIVER_AUDIT_LOG_REPOSITORY) private readonly auditLogRepository: DriverAuditLogRepository,
    private readonly authService: AuthService,
  ) {}

  private readonly logger = new Logger(DriversService.name);

  async create(dto: CreateDriverDto, actorUserId: string): Promise<DriverResponse> {
    await this.assertCpfAvailable(dto.cpf, actorUserId);
    const pis = this.normalizePis(dto.pis);
    const pixKeyType = this.detectAndValidatePixKey(dto.pixKey);
    await this.assertCepExists(dto.addressZip);

    const id = randomUUID();
    const now = new Date();
    const driver = new DriverEntity(
      id,
      dto.fullName.trim(),
      onlyDigits(dto.cpf),
      pis,
      dto.addressStreet,
      dto.addressNumber,
      dto.addressComplement ?? null,
      dto.addressNeighborhood,
      dto.addressCity,
      dto.addressState.toUpperCase(),
      onlyDigits(dto.addressZip),
      dto.cnhNumber,
      dto.cnhCategory,
      new Date(dto.cnhExpiresAt),
      null,
      pixKeyType,
      dto.pixKey.trim(),
      DriverStatus.EM_ANALISE,
      now,
      now,
      null,
      null,
      // Quem cadastra vira o gestor dono do motorista.
      actorUserId,
    );
    const contacts = dto.contacts.map(
      (contact) =>
        new DriverReferenceContactEntity(randomUUID(), id, contact.name.trim(), onlyDigits(contact.phone), contact.relationship.trim()),
    );

    const saved = await this.driversRepository.create(driver, contacts);
    await this.logAction(id, DriverAuditAction.CREATED, actorUserId, this.toResponse(saved));
    return this.toResponse(saved);
  }

  async findById(id: string, ownerUserId?: string): Promise<DriverResponse> {
    const record = await this.driversRepository.findById(id, ownerUserId);
    if (!record) {
      throw new NotFoundException('Motorista nao encontrado');
    }
    return this.toResponse(record);
  }

  async findIdByUserId(userId: string): Promise<string | null> {
    const found = await this.driversRepository.findByUserId(userId);
    return found?.driver.id ?? null;
  }

  /**
   * Gestor dono dos dados que este usuário pode ver.
   *
   * ADMIN é dono de si; motorista herda o gestor que o cadastrou. Sem
   * vínculo não há escopo, e o chamador deve tratar isso como "nada a ver".
   */
  async escopoDoUsuario(userId: string, role: 'ADMIN' | 'DRIVER'): Promise<string | null> {
    if (role === 'ADMIN') {
      return userId;
    }

    const found = await this.driversRepository.findByUserId(userId);
    return found?.driver.ownerUserId ?? null;
  }

  async list(status?: DriverStatus, ownerUserId?: string): Promise<DriverResponse[]> {
    const records = await this.driversRepository.list(status, ownerUserId);
    return records.map((record) => this.toResponse(record));
  }

  async update(
    id: string,
    dto: UpdateDriverDto,
    actorUserId: string,
    ownerUserId?: string,
  ): Promise<DriverResponse> {
    const existing = await this.driversRepository.findById(id, ownerUserId);
    if (!existing) {
      throw new NotFoundException('Motorista nao encontrado');
    }

    await this.assertCpfAvailable(dto.cpf, ownerUserId ?? existing.driver.ownerUserId, id);
    const pis = this.normalizePis(dto.pis);
    const pixKeyType = this.detectAndValidatePixKey(dto.pixKey);
    await this.assertCepExists(dto.addressZip);

    const driver = new DriverEntity(
      id,
      dto.fullName.trim(),
      onlyDigits(dto.cpf),
      pis,
      dto.addressStreet,
      dto.addressNumber,
      dto.addressComplement ?? null,
      dto.addressNeighborhood,
      dto.addressCity,
      dto.addressState.toUpperCase(),
      onlyDigits(dto.addressZip),
      dto.cnhNumber,
      dto.cnhCategory,
      new Date(dto.cnhExpiresAt),
      existing.driver.cnhImagePath,
      pixKeyType,
      dto.pixKey.trim(),
      existing.driver.status,
      existing.driver.createdAt,
      new Date(),
    );
    const contacts = dto.contacts.map(
      (contact) =>
        new DriverReferenceContactEntity(randomUUID(), id, contact.name.trim(), onlyDigits(contact.phone), contact.relationship.trim()),
    );

    const saved = await this.driversRepository.update(id, driver, contacts);
    await this.logAction(id, DriverAuditAction.UPDATED, actorUserId, this.toResponse(saved));
    return this.toResponse(saved);
  }

  async updateStatus(
    id: string,
    status: DriverStatus,
    actorUserId: string,
    ownerUserId?: string,
  ): Promise<DriverResponse> {
    // findById com o dono derruba com 404 o motorista de outro gestor.
    await this.findById(id, ownerUserId);
    const saved = await this.driversRepository.updateStatus(id, status);
    await this.logAction(id, DriverAuditAction.STATUS_CHANGED, actorUserId, this.toResponse(saved));
    return this.toResponse(saved);
  }

  async defineDriverAccess(
    id: string,
    email: string,
    password: string,
    actorUserId: string,
    ownerUserId?: string,
  ): Promise<DriverResponse> {
    const record = await this.driversRepository.findById(id, ownerUserId);
    if (!record) {
      throw new NotFoundException('Motorista nao encontrado');
    }

    const user = await this.authService.upsertDriverCredentials(
      record.driver.id,
      record.driver.fullName,
      email,
      password,
    );

    const saved = await this.driversRepository.updateAccess(
      id,
      user.id,
      actorUserId,
    );
    await this.logAction(id, DriverAuditAction.STATUS_CHANGED, actorUserId, this.toResponse(saved));
    return this.toResponse(saved);
  }

  async saveCnhImagePath(
    id: string,
    absolutePath: string,
    actorUserId: string,
    ownerUserId?: string,
  ): Promise<DriverResponse> {
    await this.findById(id, ownerUserId);
    const saved = await this.driversRepository.saveCnhImagePath(id, absolutePath);
    await this.logAction(id, DriverAuditAction.UPDATED, actorUserId, { cnhImageUpdated: true, driverId: id });
    return this.toResponse(saved);
  }

  async getCnhImagePath(id: string, ownerUserId?: string): Promise<string> {
    const record = await this.driversRepository.findById(id, ownerUserId);
    if (!record || !record.driver.cnhImagePath) {
      throw new NotFoundException('Imagem da CNH nao cadastrada');
    }
    return record.driver.cnhImagePath;
  }

  // O mesmo CPF pode existir na base de outro gestor: a checagem é por carteira.
  private async assertCpfAvailable(
    cpf: string,
    ownerUserId: string,
    ignoreId?: string,
  ): Promise<void> {
    if (!isValidCpf(cpf)) {
      throw new BadRequestException('CPF invalido');
    }

    const existing = await this.driversRepository.findByCpf(onlyDigits(cpf), ownerUserId);
    if (existing && existing.id !== ignoreId) {
      throw new ConflictException('Ja existe um motorista cadastrado com este CPF');
    }
  }

  private normalizePis(pis?: string | null): string | null {
    const digits = onlyDigits(pis ?? '');
    if (digits === '') {
      return null;
    }
    if (!isValidPis(digits)) {
      throw new BadRequestException('PIS invalido');
    }
    return digits;
  }

  private detectAndValidatePixKey(pixKey: string): PixKeyType {
    const type = detectPixKeyType(pixKey);
    if (!type || !isValidPixKey(pixKey, type)) {
      throw new BadRequestException('Chave PIX invalida');
    }
    return type;
  }

  private async assertCepExists(rawCep: string): Promise<void> {
    const cep = onlyDigits(rawCep);
    if (cep.length !== 8) {
      throw new BadRequestException('CEP deve conter 8 digitos');
    }

    let response: Response;
    try {
      response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    } catch {
      throw new BadRequestException('Nao foi possivel validar o CEP informado');
    }

    if (!response.ok) {
      throw new BadRequestException('Nao foi possivel validar o CEP informado');
    }

    const data = (await response.json()) as { erro?: boolean };
    if (data.erro) {
      throw new BadRequestException('CEP nao encontrado');
    }
  }

  private async logAction(
    driverId: string,
    action: DriverAuditAction,
    actorUserId: string,
    snapshot: unknown,
  ): Promise<void> {
    try {
      await this.auditLogRepository.log(
        new DriverAuditLogEntity(
          randomUUID(),
          driverId,
          action,
          actorUserId,
          JSON.parse(JSON.stringify(snapshot)) as Record<string, unknown>,
          new Date(),
        ),
      );
    } catch (error) {
      this.logger.error(
        `Falha ao registrar log de auditoria (${action}) para motorista ${driverId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private toResponse(record: DriverWithContacts): DriverResponse {
    const { driver, contacts } = record;
    return {
      id: driver.id,
      fullName: driver.fullName,
      cpf: driver.cpf,
      pis: driver.pis,
      address: {
        street: driver.addressStreet,
        number: driver.addressNumber,
        complement: driver.addressComplement,
        neighborhood: driver.addressNeighborhood,
        city: driver.addressCity,
        state: driver.addressState,
        zip: driver.addressZip,
      },
      cnh: {
        number: driver.cnhNumber,
        category: driver.cnhCategory,
        expiresAt: driver.cnhExpiresAt.toISOString().slice(0, 10),
        expired: driver.isCnhExpired(),
        hasImage: Boolean(driver.cnhImagePath),
      },
      pixKeyType: driver.pixKeyType,
      pixKey: driver.pixKey,
      status: driver.status,
      hasAccess: Boolean(driver.userId),
      approvedByUserId: driver.approvedByUserId,
      contacts: contacts.map((contact) => ({
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        relationship: contact.relationship,
      })),
      createdAt: driver.createdAt.toISOString(),
      updatedAt: driver.updatedAt.toISOString(),
    };
  }
}
