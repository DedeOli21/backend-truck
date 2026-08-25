import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { DriverOrmEntity } from '@database/typeorm/entities/driver.orm-entity';
import { TruckOrmEntity } from '@database/typeorm/entities/truck.orm-entity';

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

@Entity({ name: 'mdfe_documents' })
// Único dentro da carteira do gestor, não do banco inteiro.
@Unique('uq_mdfe_documents_owner_chave', ['ownerUserId', 'chave'])
export class MdfeDocumentOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  /** Gestor dono do registro. Todo acesso é filtrado por ele. */
  @Column({ name: 'owner_user_id', type: 'uuid' })
  ownerUserId!: string;

  @Column({ type: 'varchar', length: 44 })
  chave!: string;

  @Column({ type: 'int' })
  numero!: number;

  @Column({ type: 'int' })
  serie!: number;

  @Column({ type: 'int' })
  modelo!: number;

  @Column({ type: 'varchar', length: 2 })
  uf!: string;

  @Column({ name: 'cnpj_emitente', type: 'varchar', length: 14 })
  cnpjEmitente!: string;

  @Column({ type: 'smallint' })
  ambiente!: number;

  @Column({ name: 'emitido_em', type: 'timestamptz', nullable: true })
  emitidoEm!: Date | null;

  @Column({ name: 'uf_ini', type: 'varchar', length: 2 })
  ufIni!: string;

  @Column({ name: 'uf_fim', type: 'varchar', length: 2 })
  ufFim!: string;

  @Column({ name: 'municipio_carregamento', type: 'varchar', length: 150, nullable: true })
  municipioCarregamento!: string | null;

  @Column({ name: 'municipio_descarga', type: 'varchar', length: 150, nullable: true })
  municipioDescarga!: string | null;

  /** Guardado como texto separado por vírgula, igual a notasFiscais do CT-e. */
  @Column({ name: 'cte_chaves', type: 'text' })
  cteChaves!: string;

  @Column({
    name: 'valor_carga',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  valorCarga!: number | null;

  @Column({
    name: 'peso_bruto_kg',
    type: 'numeric',
    precision: 12,
    scale: 4,
    nullable: true,
    transformer: numericTransformer,
  })
  pesoBrutoKg!: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  protocolo!: string | null;

  @Column({ name: 'autorizado_em', type: 'timestamptz', nullable: true })
  autorizadoEm!: Date | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  situacao!: string | null;

  @Column({ name: 'motivo_rejeicao', type: 'varchar', length: 255, nullable: true })
  motivoRejeicao!: string | null;

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

  @Column({ name: 'encerrado_em', type: 'timestamptz', nullable: true })
  encerradoEm!: Date | null;

  @Column({ name: 'encerramento_protocolo', type: 'varchar', length: 20, nullable: true })
  encerramentoProtocolo!: string | null;

  @Column({ type: 'text', nullable: true })
  xml!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
