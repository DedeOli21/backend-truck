import { PartialType } from '@nestjs/swagger';
import { CreateSupplierDto } from '@applications/suppliers/presentation/dtos/create-supplier.dto';

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}
