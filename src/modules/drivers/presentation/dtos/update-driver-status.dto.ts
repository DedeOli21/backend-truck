import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { DriverStatus } from '@database/typeorm/entities/enums';

export class UpdateDriverStatusDto {
  @ApiProperty({ enum: DriverStatus })
  @IsEnum(DriverStatus)
  status!: DriverStatus;
}
