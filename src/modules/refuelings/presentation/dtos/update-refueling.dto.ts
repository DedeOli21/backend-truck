import { PartialType } from '@nestjs/swagger';
import { CreateRefuelingDto } from '@refuelings/presentation/dtos/create-refueling.dto';

export class UpdateRefuelingDto extends PartialType(CreateRefuelingDto) {}
