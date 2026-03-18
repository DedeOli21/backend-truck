import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsString, MinLength } from 'class-validator';

export class CreateFuelDto {
  @ApiProperty({ example: 300 })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: 'Abastecimento BR' })
  @IsString()
  @MinLength(3)
  description!: string;
}
