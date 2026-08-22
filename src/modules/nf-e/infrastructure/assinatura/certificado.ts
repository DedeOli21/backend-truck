import { BadRequestException } from '@nestjs/common';
import { readFileSync } from 'fs';
import * as forge from 'node-forge';

export interface CertificadoPem {
  chavePrivada: string;
  certificado: string;
  /** Certificado em base64 sem cabeçalho, como a assinatura da SEFAZ espera em X509Certificate. */
  certificadoBase64: string;
  cnpj: string | null;
  validoAte: Date;
}

const somenteDigitos = (valor: unknown) => String(valor ?? '').replace(/\D/g, '');

/**
 * Abre o .pfx (A1) e devolve chave e certificado em PEM, que é o formato que a
 * assinatura XML usa. A senha nunca sai daqui nem aparece em log.
 */
export const lerCertificado = (caminho: string, senha: string): CertificadoPem => {
  let p12: forge.pkcs12.Pkcs12Pfx;

  try {
    const binario = readFileSync(caminho, 'binary');
    const asn1 = forge.asn1.fromDer(binario);
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, senha);
  } catch {
    throw new BadRequestException(
      'Não foi possível abrir o certificado: arquivo inválido ou senha incorreta.',
    );
  }

  const bagsChave =
    p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
      forge.pki.oids.pkcs8ShroudedKeyBag
    ] ?? [];
  const bagsCert = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [];

  const chave = bagsChave[0]?.key;
  // Em cadeias com intermediárias, o certificado do titular é o que tem chave
  // de assinatura digital e não é CA.
  const certificados = bagsCert
    .map((bag) => bag.cert)
    .filter((cert): cert is forge.pki.Certificate => Boolean(cert));
  const cert =
    certificados.find((item) => {
      const basic = item.getExtension('basicConstraints') as { cA?: boolean } | undefined;
      return !basic?.cA;
    }) ?? certificados[0];

  if (!chave || !cert) {
    throw new BadRequestException('Certificado sem chave privada ou sem certificado utilizável.');
  }

  const pem = forge.pki.certificateToPem(cert);

  // O CNPJ do titular fica no subjectAltName, em otherName com OID 2.16.76.1.3.3.
  let cnpj: string | null = null;
  const alt = cert.getExtension('subjectAltName') as { altNames?: unknown[] } | undefined;

  for (const nome of alt?.altNames ?? []) {
    const bruto = (nome as { value?: unknown })?.value;
    // O otherName pode vir como string ou como estrutura ASN.1 aninhada.
    const texto =
      typeof bruto === 'string' ? bruto : JSON.stringify(bruto ?? (nome as unknown));
    const digitos = somenteDigitos(texto);

    // O bloco do CNPJ vem junto de outros números; procura-se a sequência exata.
    const encontrado = /(?<!\d)\d{14}(?!\d)/.exec(digitos);

    if (encontrado) {
      cnpj = encontrado[0];
      break;
    }
  }

  // Fallback: o CN do certificado A1 PJ traz "RAZAO SOCIAL:CNPJ".
  if (!cnpj) {
    const cn = cert.subject.getField('CN')?.value as string | undefined;
    const encontrado = cn ? /(?<!\d)(\d{14})(?!\d)/.exec(cn.replace(/\D/g, (c) => (c === ':' ? ':' : c))) : null;
    cnpj = encontrado?.[1] ?? (cn ? /(\d{14})/.exec(cn)?.[1] ?? null : null);
  }

  return {
    chavePrivada: forge.pki.privateKeyToPem(chave),
    certificado: pem,
    certificadoBase64: pem
      .replace(/-----(BEGIN|END) CERTIFICATE-----/g, '')
      .replace(/\s+/g, ''),
    cnpj,
    validoAte: cert.validity.notAfter,
  };
};
