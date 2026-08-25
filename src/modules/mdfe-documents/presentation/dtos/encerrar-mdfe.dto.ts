import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, Length, ValidateNested } from 'class-validator';
import { MunicipioMdfeDto } from '@mdfe-documents/presentation/dtos/emitir-mdfe.dto';

export class EncerrarMdfeDto {
  @ApiProperty({ description: 'Município onde a carga foi efetivamente descarregada' })
  @ValidateNested()
  @Type(() => MunicipioMdfeDto)
  municipioDescarga!: MunicipioMdfeDto;

  @ApiProperty({ example: 'MG', description: 'UF onde a carga foi efetivamente descarregada' })
  @IsString()
  @Length(2, 2)
  ufDescarga!: string;
}
