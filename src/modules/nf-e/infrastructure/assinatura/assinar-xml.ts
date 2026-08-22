import { SignedXml } from 'xml-crypto';
import { CertificadoPem } from '@nf-e/infrastructure/assinatura/certificado';

/**
 * Assina o documento no padrão exigido pela SEFAZ: assinatura envelopada,
 * RSA-SHA1, digest SHA-1 e canonicalização C14N, com Reference apontando para
 * o Id do infCte/infNFe. Qualquer desvio disso é rejeitado na recepção.
 */
const RAIZ: Record<string, string> = { infCte: 'CTe', infNFe: 'NFe' };

export const assinarXml = (
  xml: string,
  tagAssinada: 'infCte' | 'infNFe',
  id: string,
  certificado: CertificadoPem,
): string => {
  const assinatura = new SignedXml({
    privateKey: certificado.chavePrivada,
    publicCert: certificado.certificado,
    signatureAlgorithm: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
    canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
  });

  assinatura.addReference({
    xpath: `//*[local-name(.)='${tagAssinada}']`,
    digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    ],
    uri: `#${id}`,
    isEmptyUri: false,
  });

  // A assinatura é o último filho do elemento raiz: no CT-e 4.00 o infCTeSupl,
  // com o QR Code, fica entre o bloco assinado e a assinatura.
  assinatura.computeSignature(xml, {
    location: { reference: `//*[local-name(.)='${RAIZ[tagAssinada]}']`, action: 'append' },
  });

  return assinatura.getSignedXml();
};
