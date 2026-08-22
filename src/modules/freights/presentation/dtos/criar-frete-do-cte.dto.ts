import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class CriarFreteDoCteDto {
  @ApiPropertyOptional({
    description: 'Se omitido, usa o veículo já vinculado ao CT-e.',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  truckId?: string | null;

  @ApiPropertyOptional({
    description: 'Se omitido, usa o motorista já vinculado ao CT-e.',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  driverId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacoes?: string;
}
