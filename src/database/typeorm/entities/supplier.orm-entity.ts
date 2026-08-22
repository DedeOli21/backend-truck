import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'suppliers' })
export class SupplierOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  /** Gestor dono do registro. Todo acesso é filtrado por ele. */
  @Column({ name: 'owner_user_id', type: 'uuid' })
  ownerUserId!: string;

  @Column({ name: 'name', type: 'varchar', length: 160 })
  name!: string;
  @Column({ name: 'tax_id', type: 'varchar', length: 18 })
  taxId!: string;
  @Column({ name: 'service_type', type: 'varchar', length: 120 })
  serviceType!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
