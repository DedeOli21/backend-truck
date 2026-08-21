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

@Entity({ name: 'cte_documents' })
export class CteDocumentOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 44, unique: true })
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

  @Column({ name: 'emitido_em', type: 'timestamptz', nullable: true })
  emitidoEm!: Date | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  cfop!: string | null;

  @Column({ name: 'natureza_operacao', type: 'varchar', length: 255, nullable: true })
  naturezaOperacao!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  origem!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  destino!: string | null;

  @Column({ name: 'remetente_nome', type: 'varchar', length: 255, nullable: true })
  remetenteNome!: string | null;

  @Column({ name: 'remetente_documento', type: 'varchar', length: 20, nullable: true })
  remetenteDocumento!: string | null;

  @Column({ name: 'destinatario_nome', type: 'varchar', length: 255, nullable: true })
  destinatarioNome!: string | null;

  @Column({ name: 'destinatario_documento', type: 'varchar', length: 20, nullable: true })
  destinatarioDocumento!: string | null;

  @Column({ name: 'tomador_nome', type: 'varchar', length: 255, nullable: true })
  tomadorNome!: string | null;

  @Column({ name: 'tomador_documento', type: 'varchar', length: 20, nullable: true })
  tomadorDocumento!: string | null;

  @Column({
    name: 'valor_total_servico',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  valorTotalServico!: number | null;

  @Column({
    name: 'valor_receber',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  valorReceber!: number | null;

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
    name: 'peso_bruto',
    type: 'numeric',
    precision: 12,
    scale: 4,
    nullable: true,
    transformer: numericTransformer,
  })
  pesoBruto!: number | null;

  @Column({ name: 'produto_predominante', type: 'varchar', length: 255, nullable: true })
  produtoPredominante!: string | null;

  @Column({ name: 'notas_fiscais', type: 'text', nullable: true })
  notasFiscais!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  rntrc!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  placa!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  protocolo!: string | null;

  @Column({ name: 'autorizado_em', type: 'timestamptz', nullable: true })
  autorizadoEm!: Date | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  situacao!: string | null;

  @Column({ name: 'origem_leitura', type: 'varchar', length: 10 })
  origemLeitura!: string;

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

  @Column({ name: 'freight_id', type: 'uuid', nullable: true })
  freightId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
