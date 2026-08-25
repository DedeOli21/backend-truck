import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class ListarMdfeQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  truckId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  driverId?: string;

  @ApiPropertyOptional({ enum: ['AUTORIZADA', 'REJEITADA'] })
  @IsOptional()
  situacao?: string;

  @ApiPropertyOptional({ description: 'Emissão a partir de (YYYY-MM-DD)' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'Emissão até (YYYY-MM-DD)' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
