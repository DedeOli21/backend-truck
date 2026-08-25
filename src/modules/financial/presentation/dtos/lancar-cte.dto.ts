import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class LancarCteDto {
  @ApiPropertyOptional({
    description: 'Dias de prazo somados à autorização do CT-e para formar o vencimento.',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  prazoDias?: number;

  @ApiPropertyOptional({ description: 'Vencimento explícito (YYYY-MM-DD); ignora o prazo.' })
  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Cliente do lançamento. Omitido, casa pelo CNPJ do tomador do CT-e.',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;
}
