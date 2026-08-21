import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { NfeProvider } from '@nf-e/domain/providers/nfe.provider';

export const MOTIVO_NAO_CONFIGURADO =
  'Consulta à SEFAZ indisponível: nenhum certificado digital A1/A3 configurado neste ambiente.';

/**
 * Implementação padrão enquanto não há integração com a SEFAZ. Falha de forma
 * explícita em vez de devolver dado inventado: quem chama sabe que o documento
 * não foi consultado, e não que ele não existe.
 */
@Injectable()
export class NotConfiguredNfeProvider implements NfeProvider {
  isConfigured(): boolean {
    return false;
  }

  async consultarPorChave(): Promise<never> {
    throw new ServiceUnavailableException(MOTIVO_NAO_CONFIGURADO);
  }

  async consultarPorNumero(): Promise<never> {
    throw new ServiceUnavailableException(MOTIVO_NAO_CONFIGURADO);
  }
}
