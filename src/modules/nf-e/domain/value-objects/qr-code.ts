import { BadRequestException } from '@nestjs/common';
import { onlyDigits, parseChaveAcesso } from '@nf-e/domain/value-objects/chave-acesso';

export type OrigemLeitura = 'CHAVE' | 'QRCODE';

export interface LeituraCodigo {
  chave: string;
  origem: OrigemLeitura;
}

const SEQUENCIA_44_DIGITOS = /\d{44}/;

/**
 * Aceita os formatos que aparecem na prática ao ler o DANFE:
 * a chave crua (código de barras), a URL do QR Code da NFC-e (`?p=chave|...`)
 * e a URL do portal nacional (`?chNFe=chave`).
 */
export const extrairChaveDeCodigo = (conteudo: string): LeituraCodigo => {
  const texto = (conteudo ?? '').trim();

  if (!texto) {
    throw new BadRequestException('Informe o conteúdo do QR Code ou do código de barras.');
  }

  const somenteDigitos = onlyDigits(texto);
  const pareceChaveCrua = somenteDigitos.length === 44 && !/[a-zA-Z]/.test(texto);

  if (pareceChaveCrua) {
    parseChaveAcesso(somenteDigitos);
    return { chave: somenteDigitos, origem: 'CHAVE' };
  }

  const encontrada = SEQUENCIA_44_DIGITOS.exec(texto.replace(/[^\dA-Za-z:/?=&|.-]/g, ''));

  if (!encontrada) {
    throw new BadRequestException(
      'Não foi possível extrair uma chave de acesso do conteúdo informado.',
    );
  }

  parseChaveAcesso(encontrada[0]);
  return { chave: encontrada[0], origem: 'QRCODE' };
};
