import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';

export class MunicipioMdfeDto {
  @ApiProperty({ example: '3550308', description: 'Código IBGE do município' })
  @IsString()
  @Length(7, 7)
  codigoMunicipio!: string;

  @ApiProperty({ example: 'SAO PAULO' })
  @IsString()
  @Length(1, 150)
  municipio!: string;
}

export class EmitirMdfeDto {
  @ApiProperty({ description: 'Veículo (caminhão trator) da viagem' })
  @IsUUID()
  truckId!: string;

  @ApiProperty({ description: 'Motorista da viagem' })
  @IsUUID()
  driverId!: string;

  @ApiProperty({
    type: [String],
    description: 'Chaves dos CT-e autorizados desta viagem, pelo menos um.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  cteChaves!: string[];

  @ApiProperty({ description: 'Município de carregamento (início da viagem)' })
  @ValidateNested()
  @Type(() => MunicipioMdfeDto)
  municipioCarregamento!: MunicipioMdfeDto;

  @ApiProperty({ description: 'Município de descarga (fim da viagem)' })
  @ValidateNested()
  @Type(() => MunicipioMdfeDto)
  municipioDescarga!: MunicipioMdfeDto;

  @ApiProperty({ example: 'MG', description: 'UF de descarga (fim do percurso)' })
  @IsString()
  @Length(2, 2)
  ufFim!: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'UFs percorridas entre início e fim, quando a viagem passa por elas.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ufPercurso?: string[];
}
