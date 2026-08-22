import { PartialType, OmitType } from '@nestjs/swagger';
import { CriarFreteDto } from '@freights/presentation/dtos/criar-frete.dto';

export class AtualizarFreteDto extends PartialType(OmitType(CriarFreteDto, ['codigo'] as const)) {}
