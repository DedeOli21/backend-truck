import { PartialType } from '@nestjs/swagger';
import { CreateVehicleExpenseDto } from '@vehicle-expenses/presentation/dtos/create-vehicle-expense.dto';

export class UpdateVehicleExpenseDto extends PartialType(CreateVehicleExpenseDto) {}
