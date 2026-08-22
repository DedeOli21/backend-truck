import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { FREIGHT_STATUS, FreightStatus } from '@freights/domain/entities/freight.entity';

export class AlterarStatusDto {
  @ApiProperty({ enum: FREIGHT_STATUS, example: 'EM_TRANSITO' })
  @IsIn(FREIGHT_STATUS)
  status!: FreightStatus;
}
