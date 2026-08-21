import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { Agent, request as httpsRequest } from 'https';
import { ConsultaSefaz, NfeProvider } from '@nf-e/domain/providers/nfe.provider';
import { ChaveAcesso } from '@nf-e/domain/value-objects/chave-acesso';
import {
  montarEnvelopeConsulta,
  parseRetornoConsulta,
} from '@nf-e/infrastructure/sefaz/consulta-protocolo';
import { endpointConsulta } from '@nf-e/infrastructure/sefaz/endpoints';

export interface SefazConfig {
  certPath: string;
  certPassword: string;
  ambiente: 1 | 2;
  urlOverride?: string;
  timeoutMs: number;
}

/**
 * Consulta a situação do documento na SEFAZ via NFeConsultaProtocolo4, usando
 * o certificado A1 (.pfx) em TLS mútuo.
 *
 * A consulta de protocolo devolve situação, protocolo e data de autorização.
 * Emitente, destinatário e valor total **não** vêm por aqui: isso exige o XML
 * completo, obtido por NFeDistribuicaoDFe, que é outro serviço e só entrega
 * documentos em que o titular do certificado é parte interessada.
 */
@Injectable()
export class SefazNfeProvider implements NfeProvider {
  private readonly logger = new Logger(SefazNfeProvider.name);
  private agent: Agent | null = null;

  constructor(private readonly config: SefazConfig) {}

  isConfigured(): boolean {
    return true;
  }

  private getAgent(): Agent {
    if (!this.agent) {
      // O .pfx é lido uma vez e mantido em memória; a senha nunca é logada.
      this.agent = new Agent({
        pfx: readFileSync(this.config.certPath),
        passphrase: this.config.certPassword,
        keepAlive: true,
      });
    }

    return this.agent;
  }

  private post(url: string, envelope: string): Promise<string> {
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
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            const corpo = Buffer.concat(chunks).toString('utf8');

            if (!res.statusCode || res.statusCode >= 400) {
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

  async consultarPorChave(documento: ChaveAcesso): Promise<ConsultaSefaz> {
    const url = this.config.urlOverride ?? endpointConsulta(documento.uf, this.config.ambiente);
    const envelope = montarEnvelopeConsulta(documento.chave, this.config.ambiente);

    this.logger.log(`Consultando a SEFAZ (${documento.uf}, ambiente ${this.config.ambiente}).`);

    const retorno = parseRetornoConsulta(await this.post(url, envelope));

    return {
      situacao: retorno.situacao,
      protocolo: retorno.protocolo,
      dataAutorizacao: retorno.dataAutorizacao,
      // Não vêm na consulta de protocolo; exigem o XML via NFeDistribuicaoDFe.
      emitente: null,
      destinatario: null,
      valorTotal: null,
      xmlUrl: null,
    };
  }

  async consultarPorNumero(): Promise<never> {
    throw new ServiceUnavailableException(
      'A SEFAZ não expõe consulta por UF e número: o serviço exige a chave de acesso completa. Use GET /nf-e/qr/{chave}.',
    );
  }
}
