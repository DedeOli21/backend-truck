import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString, IsUUID, Length, Min } from 'class-validator';

export class CriarFreteDto {
  @ApiPropertyOptional({ example: 'FR-1042', description: 'Gerado automaticamente se omitido' })
  @IsOptional()
  @IsString()
  @Length(2, 30)
  codigo?: string;

  @ApiProperty({ example: 'SP - ARUJÁ' })
  @IsString()
  @Length(2, 150)
  origem!: string;

  @ApiProperty({ example: 'MG - CONTAGEM' })
  @IsString()
  @Length(2, 150)
  destino!: string;

  @ApiPropertyOptional({ example: 'L&M PACK DISTRIBUIDORA' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  clienteNome?: string;

  @ApiPropertyOptional({ example: '18442358000130' })
  @IsOptional()
  @IsString()
  @Length(11, 20)
  clienteDocumento?: string;

  @ApiPropertyOptional({ example: 'Recipientes plásticos' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  produto?: string;

  @ApiPropertyOptional({ example: 1397.55, description: 'Peso em quilos' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  peso?: number;

  @ApiProperty({ example: 4500 })
  @IsNumber()
  @IsPositive()
  valorFrete!: number;

  @ApiPropertyOptional({ example: 39587.01 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  valorCarga?: number;

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
  @IsString()
  observacoes?: string;
}
