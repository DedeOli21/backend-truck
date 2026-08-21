import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class ListarCteQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  truckId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  driverId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  freightId?: string;

  @ApiPropertyOptional({ enum: ['AUTORIZADA', 'CANCELADA', 'DENEGADA', 'INEXISTENTE'] })
  @IsOptional()
  @IsIn(['AUTORIZADA', 'CANCELADA', 'DENEGADA', 'INEXISTENTE'])
  situacao?: string;

  @ApiPropertyOptional({ example: '2026-08-01T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: '2026-08-31T23:59:59.000Z' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
