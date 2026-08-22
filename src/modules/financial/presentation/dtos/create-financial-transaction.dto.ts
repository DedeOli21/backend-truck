import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { FinancialTransactionType } from '@database/typeorm/entities/enums';

export class CreateFinancialTransactionDto {
  @ApiProperty({ enum: FinancialTransactionType, example: FinancialTransactionType.DESPESA })
  @IsEnum(FinancialTransactionType)
  type!: FinancialTransactionType;

  @ApiProperty({
    example: 'COMBUSTIVEL',
    description:
      'Classificação usada no DRE. COMBUSTIVEL, PEDAGIO, MANUTENCAO, MOTORISTA, DIARIA e COMISSAO entram como custo operacional; IMPOSTO, DEDUCAO e DEVOLUCAO como dedução da receita; o resto como despesa administrativa.',
  })
  @IsString()
  @Length(2, 80)
  category!: string;

  @ApiProperty({ example: 'Abastecimento posto Graal - CT-e 1147' })
  @IsString()
  @Length(2, 255)
  description!: string;

  @ApiProperty({ example: 1850.4 })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: '2026-09-05', description: 'Data de vencimento (YYYY-MM-DD)' })
  @IsISO8601()
  dueDate!: string;

  @ApiPropertyOptional({ description: 'Cliente ligado ao lançamento' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Fornecedor ligado ao lançamento' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Frete que originou o lançamento' })
  @IsOptional()
  @IsUUID()
  freightId?: string;
}
