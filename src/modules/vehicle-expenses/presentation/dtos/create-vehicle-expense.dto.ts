import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Length } from 'class-validator';
import { VehicleExpenseCategory } from '@database/typeorm/entities/enums';

export class CreateVehicleExpenseDto {
  @ApiProperty({ example: '2f1c7f1e-0d5a-4f7e-9d3b-0c1a2b3c4d5e' })
  @IsUUID()
  truckId!: string;

  @ApiPropertyOptional({
    description: 'Obrigatório para ADMIN. Ignorado para motorista, que lança sempre para si.',
  })
  @IsOptional()
  @IsUUID()
  driverId?: string;

  @ApiProperty({ enum: VehicleExpenseCategory, example: VehicleExpenseCategory.PEDAGIO })
  @IsEnum(VehicleExpenseCategory)
  category!: VehicleExpenseCategory;

  @ApiPropertyOptional({ example: 'Praça de pedágio Anhanguera' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  description?: string;

  @ApiProperty({ example: 380 })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: '2026-08-21T10:15:00.000Z' })
  @IsISO8601()
  spentAt!: string;
}
