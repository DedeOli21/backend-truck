import { ApiProperty } from '@nestjs/swagger';
import { Matches, MinLength } from 'class-validator';

export class ReferenceContactDto {
  @ApiProperty({ example: 'Maria Silva' })
  @MinLength(3, { message: 'Nome do contato deve ter ao menos 3 caracteres' })
  name!: string;

  @ApiProperty({ example: '11999998888' })
  @Matches(/^\d{2}9?\d{8}$/, { message: 'Telefone deve conter DDD + numero (10 ou 11 digitos)' })
  phone!: string;

  @ApiProperty({ example: 'Irmao' })
  @MinLength(2, { message: 'Grau de relacao deve ter ao menos 2 caracteres' })
  relationship!: string;
}
