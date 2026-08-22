import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsString, Length } from 'class-validator';

export class CreateFleetRouteDto {
  @ApiProperty({ example: 'Betim -> Rio de Janeiro', description: 'nome' })
  @IsString()
  @Length(2, 160)
  routeName!: string;
  @ApiProperty({ example: 'BETIM, MG', description: 'origem' })
  @IsString()
  @Length(2, 160)
  origin!: string;
  @ApiProperty({ example: 'RIO DE JANEIRO, RJ', description: 'destino' })
  @IsString()
  @Length(2, 160)
  destination!: string;
  @ApiProperty({ example: 434.7, description: 'distancia' })
  @IsNumber()
  @IsPositive()
  distanceKm!: number;
}
