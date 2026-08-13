import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class DefineDriverAccessDto {
  @ApiProperty({ example: 'motorista@empresa.com' })
  @IsEmail({}, { message: 'Email invalido' })
  email!: string;

  @ApiProperty({ example: '123456', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'Senha deve ter ao menos 6 caracteres' })
  @Matches(/^\S+$/, { message: 'Senha nao pode conter espacos' })
  password!: string;
}