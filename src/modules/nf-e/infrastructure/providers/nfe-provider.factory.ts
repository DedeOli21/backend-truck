import { Logger } from '@nestjs/common';
import { existsSync } from 'fs';
import { NfeProvider } from '@nf-e/domain/providers/nfe.provider';
import { NotConfiguredNfeProvider } from '@nf-e/infrastructure/providers/not-configured-nfe.provider';
import { SefazNfeProvider } from '@nf-e/infrastructure/providers/sefaz-nfe.provider';

const DEFAULT_TIMEOUT_MS = 20000;

/**
 * Só entrega o provider real quando há caminho de certificado, senha e o
 * arquivo existe de fato. Faltando qualquer um, cai no NotConfigured, que
 * responde de forma explícita em vez de fingir consulta.
 */
export const criarNfeProvider = (env: NodeJS.ProcessEnv = process.env): NfeProvider => {
  const logger = new Logger('NfeProviderFactory');
  const certPath = env.NFE_CERT_PATH?.trim();
  const certPassword = env.NFE_CERT_PASSWORD;

  if (!certPath || !certPassword) {
    logger.warn(
      'NFE_CERT_PATH ou NFE_CERT_PASSWORD ausente: consulta à SEFAZ desabilitada.',
    );
    return new NotConfiguredNfeProvider();
  }

  if (!existsSync(certPath)) {
    logger.error(`Certificado não encontrado em ${certPath}: consulta à SEFAZ desabilitada.`);
    return new NotConfiguredNfeProvider();
  }

  const ambiente = env.NFE_AMBIENTE === '2' ? 2 : 1;

  logger.log(
    `Consulta à SEFAZ habilitada (ambiente ${ambiente === 1 ? 'produção' : 'homologação'}).`,
  );

  return new SefazNfeProvider({
    certPath,
    certPassword,
    ambiente,
    urlOverride: env.NFE_CONSULTA_URL?.trim() || undefined,
    timeoutMs: Number(env.NFE_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
  });
};
