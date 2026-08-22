import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CnhCategory, DriverStatus, PixKeyType } from '@database/typeorm/entities/enums';
import { DriverReferenceContactOrmEntity } from '@database/typeorm/entities/driver-reference-contact.orm-entity';
import { TruckOrmEntity } from '@database/typeorm/entities/truck.orm-entity';

@Entity({ name: 'drivers' })
export class DriverOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  /** Gestor dono do registro. Todo acesso é filtrado por ele. */
  @Column({ name: 'owner_user_id', type: 'uuid' })
  ownerUserId!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ name: 'approved_by_user_id', type: 'uuid', nullable: true })
  approvedByUserId!: string | null;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName!: string;

  @Column({ type: 'varchar', length: 11, unique: true })
  cpf!: string;

  @Column({ type: 'varchar', length: 11, nullable: true })
  pis!: string | null;

  @Column({ name: 'address_street', type: 'varchar', length: 255 })
  addressStreet!: string;

  @Column({ name: 'address_number', type: 'varchar', length: 20 })
  addressNumber!: string;

  @Column({ name: 'address_complement', type: 'varchar', length: 255, nullable: true })
  addressComplement!: string | null;

  @Column({ name: 'address_neighborhood', type: 'varchar', length: 150 })
  addressNeighborhood!: string;

  @Column({ name: 'address_city', type: 'varchar', length: 150 })
  addressCity!: string;

  @Column({ name: 'address_state', type: 'varchar', length: 2 })
  addressState!: string;

  @Column({ name: 'address_zip', type: 'varchar', length: 8 })
  addressZip!: string;

  @Column({ name: 'cnh_number', type: 'varchar', length: 30 })
  cnhNumber!: string;

  @Column({ name: 'cnh_category', type: 'enum', enum: CnhCategory })
  cnhCategory!: CnhCategory;

  @Column({ name: 'cnh_expires_at', type: 'date' })
  cnhExpiresAt!: string;

  @Column({ name: 'cnh_image_path', type: 'varchar', length: 500, nullable: true })
  cnhImagePath!: string | null;

  @Column({ name: 'pix_key_type', type: 'enum', enum: PixKeyType })
  pixKeyType!: PixKeyType;

  @Column({ name: 'pix_key', type: 'varchar', length: 255 })
  pixKey!: string;

  @Column({ type: 'enum', enum: DriverStatus, default: DriverStatus.EM_ANALISE })
  status!: DriverStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => TruckOrmEntity, (truck) => truck.driver)
  trucks!: TruckOrmEntity[];

  @OneToMany(() => DriverReferenceContactOrmEntity, (contact) => contact.driver)
  contacts!: DriverReferenceContactOrmEntity[];
}
