import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class ListRefuelingsQuery {
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
