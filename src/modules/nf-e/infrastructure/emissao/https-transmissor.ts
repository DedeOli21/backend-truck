import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { Agent, request as httpsRequest } from 'https';
import { rootCertificates } from 'tls';
import { TransmissorSefaz } from '@nf-e/application/services/emissao-cte.service';
import { localizarBundleIcpBrasil } from '@nf-e/infrastructure/providers/sefaz-nfe.provider';

export interface TransmissorConfig {
  certPath: string;
  certPassword: string;
  timeoutMs: number;
}

/** Envia o XML assinado à SEFAZ em TLS mútuo, com as raízes da ICP-Brasil. */
@Injectable()
export class HttpsTransmissorSefaz implements TransmissorSefaz {
  private readonly logger = new Logger(HttpsTransmissorSefaz.name);
  private agent: Agent | null = null;

  constructor(private readonly config: TransmissorConfig) {}

  private getAgent(): Agent {
    if (!this.agent) {
      const bundle = localizarBundleIcpBrasil();
      const icp = bundle
        ? readFileSync(bundle, 'utf8')
            .split(/(?=-----BEGIN CERTIFICATE-----)/)
            .map((bloco) => bloco.trim())
            .filter((bloco) => bloco.startsWith('-----BEGIN CERTIFICATE-----'))
        : [];

      this.agent = new Agent({
        pfx: readFileSync(this.config.certPath),
        passphrase: this.config.certPassword,
        ca: [...rootCertificates, ...icp],
        keepAlive: true,
      });
    }

    return this.agent;
  }

  enviar(url: string, envelope: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const alvo = new URL(url);

      const req = httpsRequest(
        {
          hostname: alvo.hostname,
          port: alvo.port || 443,
          path: alvo.pathname + alvo.search,
          method: 'POST',
          agent: this.getAgent(),
          timeout: this.config.timeoutMs,
          headers: {
            'Content-Type': 'application/soap+xml; charset=utf-8',
            'Content-Length': Buffer.byteLength(envelope),
          },
        },
        (res) => {
          const partes: Buffer[] = [];
          res.on('data', (parte: Buffer) => partes.push(parte));
          res.on('end', () => {
            const corpo = Buffer.concat(partes).toString('utf8');

            if (!res.statusCode || res.statusCode >= 400) {
              this.logger.warn(`SEFAZ respondeu HTTP ${res.statusCode} na recepção.`);
              reject(new Error(`SEFAZ respondeu HTTP ${res.statusCode}.`));
              return;
            }

            resolve(corpo);
          });
        },
      );

      req.on('timeout', () => {
        req.destroy(new Error(`SEFAZ não respondeu em ${this.config.timeoutMs}ms.`));
      });
      req.on('error', reject);
      req.write(envelope);
      req.end();
    });
  }
}
