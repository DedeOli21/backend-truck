import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { FREIGHT_STATUS, FreightStatus } from '@freights/domain/entities/freight.entity';

export class ListarFretesQuery {
  @ApiPropertyOptional({ enum: FREIGHT_STATUS })
  @IsOptional()
  @IsIn(FREIGHT_STATUS)
  status?: FreightStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  truckId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  driverId?: string;

  @ApiPropertyOptional({ example: '2026-08-01T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: '2026-08-31T23:59:59.000Z' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
