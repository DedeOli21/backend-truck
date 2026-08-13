import { DriverStatus } from '@database/typeorm/entities/enums';
import { DriverEntity } from '@drivers/domain/entities/driver.entity';
import { DriverReferenceContactEntity } from '@drivers/domain/entities/driver-reference-contact.entity';

export const DRIVERS_REPOSITORY = 'DRIVERS_REPOSITORY';

export interface DriverWithContacts {
  driver: DriverEntity;
  contacts: DriverReferenceContactEntity[];
}

export interface DriversRepository {
  create(driver: DriverEntity, contacts: DriverReferenceContactEntity[]): Promise<DriverWithContacts>;
  findById(id: string): Promise<DriverWithContacts | null>;
  findByCpf(cpf: string): Promise<DriverEntity | null>;
  list(status?: DriverStatus): Promise<DriverWithContacts[]>;
  update(
    id: string,
    driver: DriverEntity,
    contacts: DriverReferenceContactEntity[],
  ): Promise<DriverWithContacts>;
  updateStatus(id: string, status: DriverStatus): Promise<DriverWithContacts>;
  updateAccess(
    id: string,
    userId: string | null,
    approvedByUserId: string | null,
  ): Promise<DriverWithContacts>;
  saveCnhImagePath(id: string, imagePath: string): Promise<DriverWithContacts>;
}
