import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { Agent, request as httpsRequest } from 'https';
import { join } from 'path';
import { rootCertificates } from 'tls';
import { ConsultaSefaz, NfeProvider } from '@nf-e/domain/providers/nfe.provider';
import { ChaveAcesso } from '@nf-e/domain/value-objects/chave-acesso';
import {
  montarEnvelopeConsultaCte,
  parseRetornoConsultaCte,
} from '@nf-e/infrastructure/sefaz/consulta-cte';
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
  caPath?: string;
}

/**
 * As raízes da ICP-Brasil não estão no armazenamento padrão do Node, que traz
 * as CAs da Mozilla. Sem elas, o TLS com a SEFAZ falha em
 * "unable to get local issuer certificate".
 */
const RELATIVO = 'modules/nf-e/infrastructure/sefaz/ca/icp-brasil.pem';

export const localizarBundleIcpBrasil = (caPath?: string): string | null => {
  // O layout do dist muda conforme o rootDir do build, então procura-se em
  // todos os lugares plausíveis em vez de fixar um caminho.
  const candidatos = [
    caPath,
    join(__dirname, '..', 'sefaz', 'ca', 'icp-brasil.pem'),
    join(process.cwd(), 'dist', RELATIVO),
    join(process.cwd(), 'dist', 'src', RELATIVO),
    join(process.cwd(), 'src', RELATIVO),
  ].filter((caminho): caminho is string => Boolean(caminho));

  return candidatos.find((caminho) => existsSync(caminho)) ?? null;
};

const caIcpBrasil = (caPath?: string): string[] => {
  const caminho = localizarBundleIcpBrasil(caPath);

  if (!caminho) {
    return [];
  }

  const conteudo = readFileSync(caminho, 'utf8');
  return conteudo
    .split(/(?=-----BEGIN CERTIFICATE-----)/)
    .map((bloco) => bloco.trim())
    .filter((bloco) => bloco.startsWith('-----BEGIN CERTIFICATE-----'));
};

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
      const icp = caIcpBrasil(this.config.caPath);

      if (icp.length === 0) {
        this.logger.warn(
          'Bundle da ICP-Brasil não encontrado: a verificação TLS com a SEFAZ deve falhar.',
        );
      }

      this.agent = new Agent({
        pfx: readFileSync(this.config.certPath),
        passphrase: this.config.certPassword,
        // Mantém as CAs padrão para não quebrar nenhum outro destino.
        ca: [...rootCertificates, ...icp],
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
    // CT-e e NF-e têm webservices, envelopes e namespaces distintos.
    const ehCte = documento.familia === 'CTE';
    const url =
      this.config.urlOverride ??
      endpointConsulta(documento.uf, this.config.ambiente, documento.familia);
    const envelope = ehCte
      ? montarEnvelopeConsultaCte(documento.chave, this.config.ambiente)
      : montarEnvelopeConsulta(documento.chave, this.config.ambiente);

    this.logger.log(
      `Consultando a SEFAZ (${documento.tipoDocumento}, ${documento.uf}, ambiente ${this.config.ambiente}).`,
    );

    const resposta = await this.post(url, envelope);
    const retorno = ehCte ? parseRetornoConsultaCte(resposta) : parseRetornoConsulta(resposta);

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
