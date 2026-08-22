import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ListFleetRoutesQuery {
  @ApiPropertyOptional({ description: 'Busca livre por nome' })
  @IsOptional()
  @IsString()
  search?: string;
}
