import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';

export class ComponenteFreteDto {
  @ApiProperty({ example: 'Frete valor' })
  @IsString()
  @Length(1, 60)
  nome!: string;

  @ApiProperty({ example: 4500 })
  @IsNumber()
  @Min(0)
  valor!: number;
}

export class EmitirCteDto {
  @ApiProperty({
    description: 'XML da NF-e transportada. Emitente, destinatário e carga saem daqui.',
  })
  @IsString()
  @Length(50, 5_000_000)
  nfeXml!: string;

  @ApiProperty({ example: 4500, description: 'Valor do serviço de transporte' })
  @IsNumber()
  @IsPositive()
  valorFrete!: number;

  @ApiPropertyOptional({
    type: [ComponenteFreteDto],
    description: 'Composição do valor. Se omitido, vira um único componente "Frete valor".',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComponenteFreteDto)
  componentes?: ComponenteFreteDto[];

  @ApiPropertyOptional({ description: 'Veículo que fará o transporte' })
  @IsOptional()
  @IsUUID()
  truckId?: string;

  @ApiPropertyOptional({ description: 'Motorista responsável' })
  @IsOptional()
  @IsUUID()
  driverId?: string;

  @ApiPropertyOptional({ example: 1, description: 'Série do CT-e. Padrão: 1.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  serie?: number;

  @ApiPropertyOptional({
    example: 3,
    description:
      'Tomador do serviço: 0 remetente, 1 expedidor, 2 recebedor, 3 destinatário. Padrão: 3.',
  })
  @IsOptional()
  @IsIn([0, 1, 2, 3])
  tomador?: 0 | 1 | 2 | 3;

  @ApiPropertyOptional({ example: '6353', description: 'CFOP da prestação. Padrão pela UF.' })
  @IsOptional()
  @IsString()
  @Length(4, 4)
  cfop?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  observacoes?: string;

  @ApiPropertyOptional({
    example: 2,
    description:
      'Ambiente: 1 produção, 2 homologação. Padrão: o configurado no servidor. Homologação não tem valor fiscal.',
  })
  @IsOptional()
  @IsIn([1, 2])
  ambiente?: 1 | 2;
}
