import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Min, MinLength } from 'class-validator';

export class SyncOpenBankingDto {
  @ApiProperty({ example: 'Banco Parceiro' })
  @IsString()
  @MinLength(3)
  provider!: string;

  @ApiProperty({ example: 500, minimum: 0 })
  @IsNumber()
  @Min(0)
  availableBalance!: number;
}
