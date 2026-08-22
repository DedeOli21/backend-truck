export class SupplierEntity {
  id!: string;
  ownerUserId!: string;
  name!: string;
  taxId!: string;
  serviceType!: string;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(props: Partial<SupplierEntity>) {
    Object.assign(this, props);
  }
}
