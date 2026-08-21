import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DocumentoFiscalResponse {
  @ApiProperty({ example: '35260811222333000181550010000010421123456780' })
  chave!: string;

  @ApiProperty({ example: 'SP' })
  uf!: string;

  @ApiProperty({ example: 35, description: 'Código de UF do IBGE' })
  codigoUf!: number;

  @ApiProperty({ example: 2026 })
  anoEmissao!: number;

  @ApiProperty({ example: 8 })
  mesEmissao!: number;

  @ApiProperty({ example: '11222333000181' })
  cnpjEmitente!: string;

  @ApiProperty({ example: 55, description: '55 para NF-e, 65 para NFC-e' })
  modelo!: number;

  @ApiProperty({ enum: ['NFE', 'NFCE'], example: 'NFE' })
  tipoDocumento!: 'NFE' | 'NFCE';

  @ApiProperty({ example: 1 })
  serie!: number;

  @ApiProperty({ example: 1042 })
  numero!: number;

  @ApiProperty({ example: 1, description: 'Tipo de emissão (1 = normal)' })
  tipoEmissao!: number;

  @ApiProperty({ example: 12345678 })
  codigoNumerico!: number;

  @ApiProperty({ example: 0 })
  digitoVerificador!: number;
}

export class SefazResponse {
  @ApiProperty({
    example: false,
    description: 'Indica se a SEFAZ chegou a ser consultada. Quando false, os campos abaixo vêm nulos.',
  })
  consultado!: boolean;

  @ApiPropertyOptional({
    example: 'Consulta à SEFAZ indisponível: nenhum certificado digital A1/A3 configurado neste ambiente.',
    description: 'Preenchido quando a consulta não aconteceu, explicando o motivo.',
    nullable: true,
  })
  motivo!: string | null;

  @ApiPropertyOptional({
    enum: ['AUTORIZADA', 'CANCELADA', 'DENEGADA', 'INEXISTENTE'],
    nullable: true,
  })
  situacao!: string | null;

  @ApiPropertyOptional({ example: '135260000123456', nullable: true })
  protocolo!: string | null;

  @ApiPropertyOptional({ example: '2026-08-10T12:00:00.000Z', nullable: true })
  dataAutorizacao!: string | null;

  @ApiPropertyOptional({ nullable: true })
  emitente!: { cnpj: string; razaoSocial: string | null } | null;

  @ApiPropertyOptional({ nullable: true })
  destinatario!: { cnpjCpf: string; razaoSocial: string | null } | null;

  @ApiPropertyOptional({ example: 4500, nullable: true })
  valorTotal!: number | null;

  @ApiPropertyOptional({ nullable: true })
  xmlUrl!: string | null;
}

export class ConsultaNfeResponseDto {
  @ApiProperty({
    type: DocumentoFiscalResponse,
    description: 'Dados extraídos da própria chave de acesso, sem depender da SEFAZ.',
  })
  documento!: DocumentoFiscalResponse;

  @ApiProperty({ type: SefazResponse })
  sefaz!: SefazResponse;
}

export class ValidacaoCodigoResponseDto extends ConsultaNfeResponseDto {
  @ApiProperty({ example: true })
  valido!: boolean;

  @ApiProperty({
    enum: ['CHAVE', 'QRCODE'],
    example: 'QRCODE',
    description: 'De onde a chave foi lida: chave crua (código de barras) ou URL de QR Code.',
  })
  origem!: 'CHAVE' | 'QRCODE';
}
