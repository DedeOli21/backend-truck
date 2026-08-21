export class RefuelingEntity {
  id!: string;
  truckId!: string;
  driverId!: string;
  liters!: number;
  pricePerLiter!: number;
  totalAmount!: number;
  odometer!: number;
  gasStationName!: string | null;
  refueledAt!: Date;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(props: Partial<RefuelingEntity>) {
    Object.assign(this, props);
  }
}
