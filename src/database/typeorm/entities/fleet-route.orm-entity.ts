import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

const numericTransformer = {
  to: (value: number) => value,
  from: (value: string | null) => (value === null ? 0 : Number(value)),
};

@Entity({ name: 'fleet_routes' })
export class FleetRouteOrmEntity {
  @PrimaryColumn('uuid')
  id!: string;

  /** Gestor dono do registro. Todo acesso é filtrado por ele. */
  @Column({ name: 'owner_user_id', type: 'uuid' })
  ownerUserId!: string;

  @Column({ name: 'route_name', type: 'varchar', length: 160 })
  routeName!: string;
  @Column({ name: 'origin', type: 'varchar', length: 160 })
  origin!: string;
  @Column({ name: 'destination', type: 'varchar', length: 160 })
  destination!: string;
  @Column({ name: 'distance_km', type: 'numeric', precision: 10, scale: 2, transformer: numericTransformer })
  distanceKm!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
