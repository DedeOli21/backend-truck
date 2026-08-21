import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';
import { TruckStatus, TruckType } from '@database/typeorm/entities/enums';

export class CreateTruckDto {
  @ApiProperty({ example: 'ABC1D23' })
  @IsString()
  @Length(7, 8)
  plate!: string;

  @ApiProperty({ example: 'Volvo FH 540' })
  @IsString()
  @Length(2, 120)
  brandModel!: string;

  @ApiPropertyOptional({ example: 2021 })
  @IsOptional()
  @IsInt()
  @Min(1950)
  year?: number;

  @ApiPropertyOptional({ example: '12345678' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  rntrc?: string;

  @ApiProperty({ enum: TruckType, example: TruckType.TRUCK })
  @IsEnum(TruckType)
  type!: TruckType;

  @ApiProperty({ example: 14, description: 'Capacidade em toneladas' })
  @IsNumber()
  @IsPositive()
  capacity!: number;

  @ApiPropertyOptional({ enum: TruckStatus, example: TruckStatus.ATIVO })
  @IsOptional()
  @IsEnum(TruckStatus)
  status?: TruckStatus;

  @ApiPropertyOptional({ example: '2f1c7f1e-0d5a-4f7e-9d3b-0c1a2b3c4d5e' })
  @IsOptional()
  @IsUUID()
  driverId?: string;
}
