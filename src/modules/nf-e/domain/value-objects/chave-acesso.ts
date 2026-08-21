import { BadRequestException } from '@nestjs/common';
import { isValidCnpj } from '@drivers/domain/validators/cnpj.validator';
import { codeToUf } from '@nf-e/domain/validators/uf.validator';

export type TipoDocumentoFiscal = 'NFE' | 'NFCE';

export interface ChaveAcesso {
  chave: string;
  uf: string;
  codigoUf: number;
  anoEmissao: number;
  mesEmissao: number;
  cnpjEmitente: string;
  modelo: number;
  tipoDocumento: TipoDocumentoFiscal;
  serie: number;
  numero: number;
  tipoEmissao: number;
  codigoNumerico: number;
  digitoVerificador: number;
}

export interface PartesChave {
  cUf: number;
  ano: number;
  mes: number;
  cnpj: string;
  modelo: number;
  serie: number;
  numero: number;
  tipoEmissao: number;
  codigoNumerico: number;
}

export const onlyDigits = (value: string) => value.replace(/\D/g, '');

/**
 * Dígito verificador da chave de acesso: módulo 11 com pesos 2 a 9,
 * aplicados da direita para a esquerda sobre os 43 primeiros dígitos.
 */
export const calcularDigitoVerificador = (base: string): number => {
  if (base.length !== 43 || !/^\d{43}$/.test(base)) {
    throw new BadRequestException('A base da chave deve ter 43 dígitos numéricos.');
  }

  let peso = 2;
  let soma = 0;

  for (let i = base.length - 1; i >= 0; i -= 1) {
    soma += Number(base[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }

  const resto = soma % 11;
  return resto === 0 || resto === 1 ? 0 : 11 - resto;
};

const pad = (value: number | string, size: number) => String(value).padStart(size, '0');

/** Monta uma chave válida a partir das partes, calculando o DV. Útil em testes e simulações. */
export const montarChave = (partes: PartesChave): string => {
  const base =
    pad(partes.cUf, 2) +
    pad(partes.ano, 2) +
    pad(partes.mes, 2) +
    pad(onlyDigits(partes.cnpj), 14) +
    pad(partes.modelo, 2) +
    pad(partes.serie, 3) +
    pad(partes.numero, 9) +
    pad(partes.tipoEmissao, 1) +
    pad(partes.codigoNumerico, 8);

  return base + calcularDigitoVerificador(base);
};

export const parseChaveAcesso = (raw: string): ChaveAcesso => {
  const chave = onlyDigits(raw ?? '');

  if (chave.length !== 44) {
    throw new BadRequestException('A chave de acesso deve ter 44 dígitos.');
  }

  const digitoVerificador = Number(chave[43]);

  if (calcularDigitoVerificador(chave.slice(0, 43)) !== digitoVerificador) {
    throw new BadRequestException('Chave de acesso com dígito verificador inválido.');
  }

  const codigoUf = Number(chave.slice(0, 2));
  const uf = codeToUf(codigoUf);

  if (!uf) {
    throw new BadRequestException(`Chave de acesso com código de UF desconhecido: ${codigoUf}.`);
  }

  const mesEmissao = Number(chave.slice(4, 6));

  if (mesEmissao < 1 || mesEmissao > 12) {
    throw new BadRequestException('Chave de acesso com mês de emissão inválido.');
  }

  const cnpjEmitente = chave.slice(6, 20);

  if (!isValidCnpj(cnpjEmitente)) {
    throw new BadRequestException('Chave de acesso com CNPJ de emitente inválido.');
  }

  const modelo = Number(chave.slice(20, 22));

  if (modelo !== 55 && modelo !== 65) {
    throw new BadRequestException(
      `Chave de acesso com modelo não suportado: ${modelo}. Esperado 55 (NF-e) ou 65 (NFC-e).`,
    );
  }

  return {
    chave,
    uf,
    codigoUf,
    anoEmissao: 2000 + Number(chave.slice(2, 4)),
    mesEmissao,
    cnpjEmitente,
    modelo,
    tipoDocumento: modelo === 65 ? 'NFCE' : 'NFE',
    serie: Number(chave.slice(22, 25)),
    numero: Number(chave.slice(25, 34)),
    tipoEmissao: Number(chave.slice(34, 35)),
    codigoNumerico: Number(chave.slice(35, 43)),
    digitoVerificador,
  };
};
