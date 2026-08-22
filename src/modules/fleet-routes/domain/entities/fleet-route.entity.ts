export class FleetRouteEntity {
  id!: string;
  ownerUserId!: string;
  routeName!: string;
  origin!: string;
  destination!: string;
  distanceKm!: number;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(props: Partial<FleetRouteEntity>) {
    Object.assign(this, props);
  }
}
