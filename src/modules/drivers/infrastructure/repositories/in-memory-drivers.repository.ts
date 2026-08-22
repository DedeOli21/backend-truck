import { Injectable, NotFoundException } from '@nestjs/common';
import { DriverStatus } from '@database/typeorm/entities/enums';
import { DriverEntity } from '@drivers/domain/entities/driver.entity';
import { DriverReferenceContactEntity } from '@drivers/domain/entities/driver-reference-contact.entity';
import {
  DriverWithContacts,
  DriversRepository,
} from '@drivers/domain/repositories/drivers.repository';

@Injectable()
export class InMemoryDriversRepository implements DriversRepository {
  private readonly drivers = new Map<string, DriverEntity>();
  private readonly contacts = new Map<string, DriverReferenceContactEntity[]>();

  async create(
    driver: DriverEntity,
    contacts: DriverReferenceContactEntity[],
  ): Promise<DriverWithContacts> {
    this.drivers.set(driver.id, driver);
    this.contacts.set(driver.id, contacts);
    return { driver, contacts };
  }

  async findById(id: string, ownerUserId?: string): Promise<DriverWithContacts | null> {
    const driver = this.drivers.get(id);
    if (!driver || (ownerUserId && driver.ownerUserId !== ownerUserId)) {
      return null;
    }
    return { driver, contacts: this.contacts.get(id) ?? [] };
  }

  async findByUserId(userId: string): Promise<DriverWithContacts | null> {
    const driver = [...this.drivers.values()].find((item) => item.userId === userId);

    if (!driver) {
      return null;
    }

    return { driver, contacts: this.contacts.get(driver.id) ?? [] };
  }

  async findByCpf(cpf: string): Promise<DriverEntity | null> {
    return [...this.drivers.values()].find((driver) => driver.cpf === cpf) ?? null;
  }

  async list(status?: DriverStatus, ownerUserId?: string): Promise<DriverWithContacts[]> {
    return [...this.drivers.values()]
      .filter((driver) => !status || driver.status === status)
      .filter((driver) => !ownerUserId || driver.ownerUserId === ownerUserId)
      .map((driver) => ({ driver, contacts: this.contacts.get(driver.id) ?? [] }));
  }

  async update(
    id: string,
    driver: DriverEntity,
    contacts: DriverReferenceContactEntity[],
  ): Promise<DriverWithContacts> {
    if (!this.drivers.has(id)) {
      throw new NotFoundException('Motorista nao encontrado');
    }
    this.drivers.set(id, driver);
    this.contacts.set(id, contacts);
    return { driver, contacts };
  }

  async updateStatus(id: string, status: DriverStatus): Promise<DriverWithContacts> {
    const existing = this.drivers.get(id);
    if (!existing) {
      throw new NotFoundException('Motorista nao encontrado');
    }
    existing.status = status;
    existing.updatedAt = new Date();
    return { driver: existing, contacts: this.contacts.get(id) ?? [] };
  }

  async updateAccess(
    id: string,
    userId: string | null,
    approvedByUserId: string | null,
  ): Promise<DriverWithContacts> {
    const existing = this.drivers.get(id);
    if (!existing) {
      throw new NotFoundException('Motorista nao encontrado');
    }
    existing.userId = userId;
    existing.approvedByUserId = approvedByUserId;
    if (approvedByUserId) {
      existing.status = DriverStatus.APROVADO;
    }
    existing.updatedAt = new Date();
    return { driver: existing, contacts: this.contacts.get(id) ?? [] };
  }

  async saveCnhImagePath(id: string, imagePath: string): Promise<DriverWithContacts> {
    const existing = this.drivers.get(id);
    if (!existing) {
      throw new NotFoundException('Motorista nao encontrado');
    }
    existing.cnhImagePath = imagePath;
    existing.updatedAt = new Date();
    return { driver: existing, contacts: this.contacts.get(id) ?? [] };
  }
}
