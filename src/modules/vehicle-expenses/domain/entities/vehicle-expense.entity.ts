import { VehicleExpenseCategory } from '@database/typeorm/entities/enums';

export class VehicleExpenseEntity {
  id!: string;
  ownerUserId!: string;
  truckId!: string;
  driverId!: string;
  category!: VehicleExpenseCategory;
  description!: string | null;
  amount!: number;
  spentAt!: Date;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(props: Partial<VehicleExpenseEntity>) {
    Object.assign(this, props);
  }
}
