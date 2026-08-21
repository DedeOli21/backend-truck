import { PartialType } from '@nestjs/swagger';
import { CreateTruckDto } from '@trucks/presentation/dtos/create-truck.dto';

export class UpdateTruckDto extends PartialType(CreateTruckDto) {}
