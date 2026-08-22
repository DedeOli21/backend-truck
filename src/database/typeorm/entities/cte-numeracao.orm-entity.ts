import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity({ name: 'cte_numeracao' })
@Unique('uq_cte_numeracao', ['ambiente', 'serie'])
export class CteNumeracaoOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'smallint' })
  ambiente!: number;

  @Column({ type: 'int' })
  serie!: number;

  @Column({ name: 'ultimo_numero', type: 'int', default: 0 })
  ultimoNumero!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
