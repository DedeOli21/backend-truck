import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Cosan Lubrificantes', description: 'nome' })
  @IsString()
  @Length(2, 160)
  name!: string;
  @ApiProperty({ example: '33.000.167/0001-01', description: 'cnpjCpf' })
  @IsString()
  @Length(11, 18)
  taxId!: string;
  @ApiProperty({ example: '(11) 3555-1000', description: 'telefone' })
  @IsString()
  @Length(8, 20)
  phone!: string;
  @ApiProperty({ example: 'Av. Brigadeiro Faria Lima, 4100 - Sao Paulo/SP', description: 'endereco' })
  @IsString()
  @Length(3, 255)
  address!: string;
}
