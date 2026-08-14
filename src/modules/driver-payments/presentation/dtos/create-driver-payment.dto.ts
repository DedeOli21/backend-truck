import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PixKeyType, TollStatus } from '@database/typeorm/entities/enums';

export class CreateDriverPaymentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  driverId!: string;

  @ApiPropertyOptional({ example: 'motorista@example.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  pixKey?: string;

  @ApiPropertyOptional({ enum: PixKeyType })
  @IsOptional()
  @IsEnum(PixKeyType)
  pixKeyType?: PixKeyType;

  @ApiProperty({ example: 2500 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  baseAmount!: number;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tollAmount?: number;

  @ApiPropertyOptional({ enum: TollStatus, default: TollStatus.UNPAID })
  @IsOptional()
  @IsEnum(TollStatus)
  tollStatus?: TollStatus;

  @ApiProperty({ example: '2026-08-10' })
  @IsDateString()
  loadingDate!: string;

  @ApiProperty({ example: '2026-08-12' })
  @IsDateString()
  deliveryDate!: string;

  @ApiProperty({ example: 'Cliente Exemplo LTDA' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  clientName!: string;
}
