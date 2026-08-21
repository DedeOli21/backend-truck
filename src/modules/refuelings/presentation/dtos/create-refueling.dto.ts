import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

export class CreateRefuelingDto {
  @ApiProperty({ example: '2f1c7f1e-0d5a-4f7e-9d3b-0c1a2b3c4d5e' })
  @IsUUID()
  truckId!: string;

  @ApiPropertyOptional({
    description: 'Obrigatório para ADMIN. Ignorado para motorista, que lança sempre para si.',
  })
  @IsOptional()
  @IsUUID()
  driverId?: string;

  @ApiProperty({ example: 320 })
  @IsNumber()
  @IsPositive()
  liters!: number;

  @ApiProperty({ example: 2240, description: 'Valor total pago' })
  @IsNumber()
  @IsPositive()
  totalAmount!: number;

  @ApiProperty({ example: 184520 })
  @IsInt()
  @Min(0)
  odometer!: number;

  @ApiPropertyOptional({ example: 'Posto BR Marginal' })
  @IsOptional()
  @IsString()
  @Length(1, 150)
  gasStationName?: string;

  @ApiProperty({ example: '2026-08-21T10:30:00.000Z' })
  @IsISO8601()
  refueledAt!: string;
}
