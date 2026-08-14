import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { DriverPaymentStatus, TollStatus } from '@database/typeorm/entities/enums';

export class ListDriverPaymentsQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  driverId?: string;

  @ApiPropertyOptional({ example: 'ABC1D23' })
  @IsOptional()
  @IsString()
  plate?: string;

  @ApiPropertyOptional({ example: 'Cliente Exemplo' })
  @IsOptional()
  @IsString()
  client?: string;

  @ApiPropertyOptional({ enum: TollStatus })
  @IsOptional()
  @IsEnum(TollStatus)
  tollStatus?: TollStatus;

  @ApiPropertyOptional({ enum: DriverPaymentStatus })
  @IsOptional()
  @IsEnum(DriverPaymentStatus)
  paymentStatus?: DriverPaymentStatus;

  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-08-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ enum: ['loading', 'delivery'], default: 'loading' })
  @IsOptional()
  @IsIn(['loading', 'delivery'])
  dateField?: 'loading' | 'delivery';
}
