import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DriverOrmEntity } from '@database/typeorm/entities/driver.orm-entity';
import { TruckOrmEntity } from '@database/typeorm/entities/truck.orm-entity';

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

@Entity({ name: 'freights' })
export class FreightOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  /** Gestor dono do registro. Todo acesso é filtrado por ele. */
  @Column({ name: 'owner_user_id', type: 'uuid' })
  ownerUserId!: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  codigo!: string;

  @Column({ type: 'varchar', length: 150 })
  origem!: string;

  @Column({ type: 'varchar', length: 150 })
  destino!: string;

  @Column({ name: 'cliente_nome', type: 'varchar', length: 255, nullable: true })
  clienteNome!: string | null;

  @Column({ name: 'cliente_documento', type: 'varchar', length: 20, nullable: true })
  clienteDocumento!: string | null;

  @Column({ name: 'remetente_nome', type: 'varchar', length: 255, nullable: true })
  remetenteNome!: string | null;

  @Column({ name: 'destinatario_nome', type: 'varchar', length: 255, nullable: true })
  destinatarioNome!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  produto!: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 4, nullable: true, transformer: numericTransformer })
  peso!: number | null;

  @Column({ name: 'valor_frete', type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  valorFrete!: number;

  @Column({ name: 'valor_carga', type: 'numeric', precision: 14, scale: 2, nullable: true, transformer: numericTransformer })
  valorCarga!: number | null;

  @Column({ type: 'varchar', length: 20 })
  status!: string;

  @Column({ name: 'truck_id', type: 'uuid', nullable: true })
  truckId!: string | null;

  @ManyToOne(() => TruckOrmEntity, { nullable: true })
  @JoinColumn({ name: 'truck_id' })
  truck!: TruckOrmEntity | null;

  @Column({ name: 'driver_id', type: 'uuid', nullable: true })
  driverId!: string | null;

  @ManyToOne(() => DriverOrmEntity, { nullable: true })
  @JoinColumn({ name: 'driver_id' })
  driver!: DriverOrmEntity | null;

  @Column({ name: 'iniciado_em', type: 'timestamptz', nullable: true })
  iniciadoEm!: Date | null;

  @Column({ name: 'concluido_em', type: 'timestamptz', nullable: true })
  concluidoEm!: Date | null;

  @Column({ type: 'text', nullable: true })
  observacoes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
