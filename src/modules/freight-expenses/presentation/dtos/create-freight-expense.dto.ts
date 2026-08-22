import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Length,
} from 'class-validator';
import { FreightExpenseType } from '@database/typeorm/entities/enums';

export class CreateFreightExpenseDto {
  @ApiProperty({ enum: FreightExpenseType, example: FreightExpenseType.PEDAGIO })
  @IsEnum(FreightExpenseType)
  type!: FreightExpenseType;

  @ApiProperty({ example: 180.5, description: 'Valor da despesa em reais' })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ example: 'Pedágio Régis Bittencourt' })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  description?: string;

  @ApiPropertyOptional({
    example: 'https://drive.google.com/file/d/abc123/view',
    description: 'Link do comprovante já hospedado. O upload do arquivo em si não é feito por esta rota.',
  })
  @IsOptional()
  @IsUrl()
  @Length(1, 500)
  receiptUrl?: string;
}
