import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, Length } from 'class-validator';

export class SettleFinancialTransactionDto {
  @ApiProperty({ example: '2026-09-05', description: 'Data da baixa (YYYY-MM-DD)' })
  @IsISO8601()
  paidAt!: string;

  @ApiPropertyOptional({ example: 'Itaú - conta 12345-6' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  bankAccount?: string;
}
