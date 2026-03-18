import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Administrador' })
  @IsString()
  @MinLength(3)
  name!: string;

  @ApiProperty({ example: 'admin@empresa.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ enum: ['ADMIN', 'DRIVER'], example: 'ADMIN' })
  @IsIn(['ADMIN', 'DRIVER'])
  role!: 'ADMIN' | 'DRIVER';
}
