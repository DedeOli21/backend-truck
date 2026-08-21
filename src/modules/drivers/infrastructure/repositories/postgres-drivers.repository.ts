import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, Repository } from 'typeorm';
import { DriverStatus } from '@database/typeorm/entities/enums';
import { DriverOrmEntity } from '@database/typeorm/entities/driver.orm-entity';
import { DriverReferenceContactOrmEntity } from '@database/typeorm/entities/driver-reference-contact.orm-entity';
import { DriverAuditLogEntity } from '@drivers/domain/entities/driver-audit-log.entity';
import { DriverEntity } from '@drivers/domain/entities/driver.entity';
import { DriverReferenceContactEntity } from '@drivers/domain/entities/driver-reference-contact.entity';
import { DriverWithContacts, DriversRepository } from '@drivers/domain/repositories/drivers.repository';

@Injectable()
export class PostgresDriversRepository implements DriversRepository {
  constructor(
    @InjectRepository(DriverOrmEntity)
    private readonly driversRepository: Repository<DriverOrmEntity>,
    @InjectRepository(DriverReferenceContactOrmEntity)
    private readonly contactsRepository: Repository<DriverReferenceContactOrmEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async create(
    driver: DriverEntity,
    contacts: DriverReferenceContactEntity[],
  ): Promise<DriverWithContacts> {
    await this.dataSource.transaction(async (manager) => {
      const driversRepo = manager.getRepository(DriverOrmEntity);
      const contactsRepo = manager.getRepository(DriverReferenceContactOrmEntity);
      await driversRepo.save(driversRepo.create(this.driverToOrm(driver)));
      await contactsRepo.save(
        contacts.map((contact) => contactsRepo.create(this.contactToOrm(contact))),
      );
    });
    return this.mustFindById(driver.id);
  }

  async findById(id: string): Promise<DriverWithContacts | null> {
    const row = await this.driversRepository.findOne({ where: { id }, relations: ['contacts'] });
    return row ? this.toDomain(row) : null;
  }

  async findByUserId(userId: string): Promise<DriverWithContacts | null> {
    const row = await this.driversRepository.findOne({ where: { userId }, relations: ['contacts'] });
    return row ? this.toDomain(row) : null;
  }

  async findByCpf(cpf: string): Promise<DriverEntity | null> {
    const row = await this.driversRepository.findOne({ where: { cpf } });
    return row ? this.toDomain(row).driver : null;
  }

  async list(status?: DriverStatus): Promise<DriverWithContacts[]> {
    const rows = await this.driversRepository.find({
      where: status ? { status } : {},
      relations: ['contacts'],
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async update(
    id: string,
    driver: DriverEntity,
    contacts: DriverReferenceContactEntity[],
  ): Promise<DriverWithContacts> {
    const { id: _id, userId: _userId, ...fields } = this.driverToOrm(driver);
    await this.dataSource.transaction(async (manager) => {
      const driversRepo = manager.getRepository(DriverOrmEntity);
      const contactsRepo = manager.getRepository(DriverReferenceContactOrmEntity);
      await driversRepo.update({ id }, fields);
      await contactsRepo.delete({ driverId: id });
      await contactsRepo.save(
        contacts.map((contact) => contactsRepo.create(this.contactToOrm(contact))),
      );
    });
    return this.mustFindById(id);
  }

  async updateStatus(id: string, status: DriverStatus): Promise<DriverWithContacts> {
    const result = await this.driversRepository.update({ id }, { status });
    if (!result.affected) {
      throw new NotFoundException('Motorista nao encontrado');
    }
    return this.mustFindById(id);
  }

  async updateAccess(
    id: string,
    userId: string | null,
    approvedByUserId: string | null,
  ): Promise<DriverWithContacts> {
    const result = await this.driversRepository.update(
      { id },
      {
        userId,
        approvedByUserId,
        ...(approvedByUserId ? { status: DriverStatus.APROVADO } : {}),
      },
    );
    if (!result.affected) {
      throw new NotFoundException('Motorista nao encontrado');
    }
    return this.mustFindById(id);
  }

  async saveCnhImagePath(id: string, imagePath: string): Promise<DriverWithContacts> {
    const result = await this.driversRepository.update({ id }, { cnhImagePath: imagePath });
    if (!result.affected) {
      throw new NotFoundException('Motorista nao encontrado');
    }
    return this.mustFindById(id);
  }

  private async mustFindById(id: string): Promise<DriverWithContacts> {
    const record = await this.findById(id);
    if (!record) {
      throw new Error(`Driver ${id} not found after write`);
    }
    return record;
  }

  private driverToOrm(driver: DriverEntity): DeepPartial<DriverOrmEntity> {
    return {
      id: driver.id,
      userId: driver.userId,
      approvedByUserId: driver.approvedByUserId,
      fullName: driver.fullName,
      cpf: driver.cpf,
      pis: driver.pis,
      addressStreet: driver.addressStreet,
      addressNumber: driver.addressNumber,
      addressComplement: driver.addressComplement,
      addressNeighborhood: driver.addressNeighborhood,
      addressCity: driver.addressCity,
      addressState: driver.addressState,
      addressZip: driver.addressZip,
      cnhNumber: driver.cnhNumber,
      cnhCategory: driver.cnhCategory,
      cnhExpiresAt: driver.cnhExpiresAt.toISOString().slice(0, 10),
      cnhImagePath: driver.cnhImagePath,
      pixKeyType: driver.pixKeyType,
      pixKey: driver.pixKey,
      status: driver.status,
    };
  }

  private contactToOrm(
    contact: DriverReferenceContactEntity,
  ): DeepPartial<DriverReferenceContactOrmEntity> {
    return {
      id: contact.id,
      driverId: contact.driverId,
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
    };
  }

  private toDomain(row: DriverOrmEntity): DriverWithContacts {
    const driver = new DriverEntity(
      row.id,
      row.fullName,
      row.cpf,
      row.pis,
      row.addressStreet,
      row.addressNumber,
      row.addressComplement,
      row.addressNeighborhood,
      row.addressCity,
      row.addressState,
      row.addressZip,
      row.cnhNumber,
      row.cnhCategory,
      new Date(row.cnhExpiresAt),
      row.cnhImagePath,
      row.pixKeyType,
      row.pixKey,
      row.status,
      row.createdAt,
      row.updatedAt,
      row.userId,
      row.approvedByUserId,
    );
    const contacts = (row.contacts ?? []).map(
      (contact) =>
        new DriverReferenceContactEntity(contact.id, contact.driverId, contact.name, contact.phone, contact.relationship),
    );
    return { driver, contacts };
  }
}
