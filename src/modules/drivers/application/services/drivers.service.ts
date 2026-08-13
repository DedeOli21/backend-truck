import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CnhCategory, DriverAuditAction, DriverStatus, PixKeyType } from '@database/typeorm/entities/enums';
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
  pis: string;
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
  contacts: Array<{ id: string; name: string; phone: string; relationship: string }>;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class DriversService {
  constructor(
    @Inject(DRIVERS_REPOSITORY) private readonly driversRepository: DriversRepository,
    @Inject(DRIVER_AUDIT_LOG_REPOSITORY) private readonly auditLogRepository: DriverAuditLogRepository,
  ) {}

  async create(dto: CreateDriverDto, actorUserId: string): Promise<DriverResponse> {
    await this.assertCpfAvailable(dto.cpf);
    this.assertPisValid(dto.pis);
    const pixKeyType = this.detectAndValidatePixKey(dto.pixKey);
    await this.assertCepExists(dto.addressZip);

    const id = randomUUID();
    const now = new Date();
    const driver = new DriverEntity(
      id,
      dto.fullName.trim(),
      onlyDigits(dto.cpf),
      onlyDigits(dto.pis),
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
    );
    const contacts = dto.contacts.map(
      (contact) =>
        new DriverReferenceContactEntity(randomUUID(), id, contact.name.trim(), onlyDigits(contact.phone), contact.relationship.trim()),
    );

    const saved = await this.driversRepository.create(driver, contacts);
    await this.logAction(id, DriverAuditAction.CREATED, actorUserId, saved);
    return this.toResponse(saved);
  }

  async findById(id: string): Promise<DriverResponse> {
    const record = await this.driversRepository.findById(id);
    if (!record) {
      throw new NotFoundException('Motorista nao encontrado');
    }
    return this.toResponse(record);
  }

  async list(status?: DriverStatus): Promise<DriverResponse[]> {
    const records = await this.driversRepository.list(status);
    return records.map((record) => this.toResponse(record));
  }

  async update(id: string, dto: UpdateDriverDto, actorUserId: string): Promise<DriverResponse> {
    const existing = await this.driversRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Motorista nao encontrado');
    }

    await this.assertCpfAvailable(dto.cpf, id);
    this.assertPisValid(dto.pis);
    const pixKeyType = this.detectAndValidatePixKey(dto.pixKey);
    await this.assertCepExists(dto.addressZip);

    const driver = new DriverEntity(
      id,
      dto.fullName.trim(),
      onlyDigits(dto.cpf),
      onlyDigits(dto.pis),
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
    await this.logAction(id, DriverAuditAction.UPDATED, actorUserId, saved);
    return this.toResponse(saved);
  }

  async updateStatus(id: string, status: DriverStatus, actorUserId: string): Promise<DriverResponse> {
    const saved = await this.driversRepository.updateStatus(id, status);
    await this.logAction(id, DriverAuditAction.STATUS_CHANGED, actorUserId, saved);
    return this.toResponse(saved);
  }

  async saveCnhImagePath(id: string, absolutePath: string, actorUserId: string): Promise<DriverResponse> {
    const saved = await this.driversRepository.saveCnhImagePath(id, absolutePath);
    await this.logAction(id, DriverAuditAction.UPDATED, actorUserId, { cnhImageUpdated: true, driverId: id });
    return this.toResponse(saved);
  }

  async getCnhImagePath(id: string): Promise<string> {
    const record = await this.driversRepository.findById(id);
    if (!record || !record.driver.cnhImagePath) {
      throw new NotFoundException('Imagem da CNH nao cadastrada');
    }
    return record.driver.cnhImagePath;
  }

  private async assertCpfAvailable(cpf: string, ignoreId?: string): Promise<void> {
    if (!isValidCpf(cpf)) {
      throw new BadRequestException('CPF invalido');
    }

    const existing = await this.driversRepository.findByCpf(onlyDigits(cpf));
    if (existing && existing.id !== ignoreId) {
      throw new ConflictException('Ja existe um motorista cadastrado com este CPF');
    }
  }

  private assertPisValid(pis: string): void {
    if (!isValidPis(pis)) {
      throw new BadRequestException('PIS invalido');
    }
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
