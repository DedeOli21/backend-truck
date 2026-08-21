import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ImportarXmlDto {
  @ApiProperty({
    description: 'Conteúdo do arquivo XML do CT-e, com ou sem o envelope cteProc.',
    example: '<cteProc versao="4.00"><CTe><infCte ...>...</infCte></CTe></cteProc>',
  })
  @IsString()
  @MinLength(50)
  xml!: string;
}
