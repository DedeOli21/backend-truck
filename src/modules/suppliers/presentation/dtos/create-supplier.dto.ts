import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Auto Pecas Sao Jorge', description: 'nome' })
  @IsString()
  @Length(2, 160)
  name!: string;
  @ApiProperty({ example: '12.345.678/0001-90', description: 'cnpjCpf' })
  @IsString()
  @Length(11, 18)
  taxId!: string;
  @ApiProperty({ example: 'Manutencao mecanica', description: 'tipoServico' })
  @IsString()
  @Length(2, 120)
  serviceType!: string;
}
