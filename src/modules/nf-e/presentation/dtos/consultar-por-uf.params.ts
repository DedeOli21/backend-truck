import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsString, Length, Max, Min } from 'class-validator';

export class ConsultarPorUfParams {
  @ApiProperty({ example: 'SP', description: 'Sigla da UF do emitente' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
  @IsString()
  @Length(2, 2)
  uf!: string;

  @ApiProperty({ example: 1042, description: 'Número da nota fiscal' })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(999999999)
  numero!: number;
}
