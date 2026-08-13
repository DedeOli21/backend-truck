import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { DriverOrmEntity } from '@database/typeorm/entities/driver.orm-entity';

@Entity({ name: 'driver_reference_contacts' })
export class DriverReferenceContactOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'driver_id', type: 'uuid' })
  driverId!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 11 })
  phone!: string;

  @Column({ type: 'varchar', length: 100 })
  relationship!: string;

  @ManyToOne(() => DriverOrmEntity, (driver) => driver.contacts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driver_id' })
  driver!: DriverOrmEntity;
}
