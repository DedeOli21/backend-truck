import { PartialType } from '@nestjs/swagger';
import { CreateCustomerDto } from '@applications/customers/presentation/dtos/create-customer.dto';

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
