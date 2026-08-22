export class CustomerEntity {
  id!: string;
  ownerUserId!: string;
  name!: string;
  taxId!: string;
  phone!: string;
  address!: string;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(props: Partial<CustomerEntity>) {
    Object.assign(this, props);
  }
}
