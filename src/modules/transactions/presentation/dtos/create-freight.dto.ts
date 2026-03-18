import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsString, MinLength } from 'class-validator';

export class CreateFreightDto {
  @ApiProperty({ example: 1500 })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: 'Frete Sao Paulo' })
  @IsString()
  @MinLength(3)
  description!: string;
}
