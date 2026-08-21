import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class VincularCteDto {
  @ApiPropertyOptional({ description: 'Veículo que fez o transporte. null desvincula.', nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  truckId?: string | null;

  @ApiPropertyOptional({ description: 'Motorista responsável. null desvincula.', nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  driverId?: string | null;

  @ApiPropertyOptional({
    description:
      'Frete ao qual o CT-e pertence. O módulo de fretes ainda não existe no backend: o campo é aceito e guardado, mas sem verificação de existência.',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  freightId?: string | null;
}
