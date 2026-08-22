import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class ListFinancialTransactionsQuery {
  @ApiPropertyOptional({
    enum: ['PAGAR', 'RECEBER'],
    description: 'PAGAR devolve as despesas; RECEBER, as receitas. Omitido devolve tudo.',
  })
  @IsOptional()
  @IsIn(['PAGAR', 'RECEBER'])
  account?: 'PAGAR' | 'RECEBER';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  freightId?: string;

  @ApiPropertyOptional({ description: 'Vencimento a partir de (YYYY-MM-DD)' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'Vencimento até (YYYY-MM-DD)' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
