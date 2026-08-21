import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ValidarCodigoDto {
  @ApiProperty({
    description:
      'Conteúdo lido do QR Code ou do código de barras do DANFE. Aceita a chave crua de 44 dígitos ou a URL do QR Code.',
    example:
      'https://www.fazenda.sp.gov.br/nfce/qrcode?p=35260811222333000181550010000010421123456780|2|1|1|ABCDEF',
  })
  @IsString()
  @Length(1, 2000)
  conteudo!: string;
}
