import { TruckStatus, TruckType } from '@database/typeorm/entities/enums';

export class TruckEntity {
  id!: string;
  plate!: string;
  rntrc!: string | null;
  brandModel!: string;
  year!: number | null;
  type!: TruckType;
  capacity!: number;
  status!: TruckStatus;
  driverId!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(props: Partial<TruckEntity>) {
    Object.assign(this, props);
  }
}
