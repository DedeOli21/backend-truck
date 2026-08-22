import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'customers' })
export class CustomerOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  /** Gestor dono do registro. Todo acesso é filtrado por ele. */
  @Column({ name: 'owner_user_id', type: 'uuid' })
  ownerUserId!: string;

  @Column({ name: 'name', type: 'varchar', length: 160 })
  name!: string;
  @Column({ name: 'tax_id', type: 'varchar', length: 18 })
  taxId!: string;
  @Column({ name: 'phone', type: 'varchar', length: 20 })
  phone!: string;
  @Column({ name: 'address', type: 'varchar', length: 255 })
  address!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
