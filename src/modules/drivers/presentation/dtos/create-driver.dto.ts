import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CnhCategory } from '@database/typeorm/entities/enums';
import { ReferenceContactDto } from '@drivers/presentation/dtos/reference-contact.dto';

export class CreateDriverDto {
  @ApiProperty({ example: 'Joao da Silva Santos' })
  @Matches(/^[A-Za-zÀ-ÿ\s]+$/, { message: 'Nome deve conter apenas letras e espacos' })
  @MinLength(5, { message: 'Nome deve ter ao menos 5 caracteres' })
  fullName!: string;

  @ApiProperty({ example: '52998224725' })
  @Matches(/^\d{11}$/, { message: 'CPF deve conter 11 digitos' })
  cpf!: string;

  @ApiProperty({ example: '12056275319' })
  @Matches(/^\d{11}$/, { message: 'PIS deve conter 11 digitos' })
  pis!: string;

  @ApiProperty({ example: 'Rua das Flores' })
  @IsString()
  @MinLength(1)
  addressStreet!: string;

  @ApiProperty({ example: '123' })
  @IsString()
  @MinLength(1)
  addressNumber!: string;

  @ApiPropertyOptional({ example: 'Apto 12' })
  @IsOptional()
  @IsString()
  addressComplement?: string;

  @ApiProperty({ example: 'Centro' })
  @IsString()
  @MinLength(1)
  addressNeighborhood!: string;

  @ApiProperty({ example: 'Sao Paulo' })
  @IsString()
  @MinLength(1)
  addressCity!: string;

  @ApiProperty({ example: 'SP' })
  @Matches(/^[A-Za-z]{2}$/, { message: 'Estado deve ter 2 letras' })
  addressState!: string;

  @ApiProperty({ example: '01310100' })
  @Matches(/^\d{8}$/, { message: 'CEP deve conter 8 digitos' })
  addressZip!: string;

  @ApiProperty({ example: '123456789' })
  @IsString()
  @MinLength(1)
  cnhNumber!: string;

  @ApiProperty({ enum: CnhCategory })
  @IsEnum(CnhCategory, { message: 'Categoria de CNH invalida' })
  cnhCategory!: CnhCategory;

  @ApiProperty({ example: '2028-05-01' })
  @IsDateString()
  cnhExpiresAt!: string;

  @ApiProperty({ example: 'motorista@example.com' })
  @IsString()
  @MinLength(3)
  pixKey!: string;

  @ApiProperty({ type: [ReferenceContactDto] })
  @ValidateNested({ each: true })
  @Type(() => ReferenceContactDto)
  @ArrayMinSize(3, { message: 'Sao necessarios exatamente 3 contatos de referencia' })
  @ArrayMaxSize(3, { message: 'Sao necessarios exatamente 3 contatos de referencia' })
  contacts!: ReferenceContactDto[];
}
