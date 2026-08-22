import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class GenerateInvoiceDto {
  @ApiProperty({ description: 'Cliente da fatura' })
  @IsUUID()
  customerId!: string;

  @ApiPropertyOptional({
    description:
      'Nome do cliente como consta no frete. Informado, restringe a consolidação aos fretes desse cliente.',
    example: 'COSAN LUBRIFICANTES',
  })
  @IsOptional()
  @IsString()
  @Length(1, 160)
  customerName?: string;

  @ApiProperty({ example: '2026-08-01' })
  @IsISO8601()
  periodStart!: string;

  @ApiProperty({ example: '2026-08-31' })
  @IsISO8601()
  periodEnd!: string;
}
