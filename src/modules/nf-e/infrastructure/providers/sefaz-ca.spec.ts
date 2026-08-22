import { readFileSync } from 'fs';
import { localizarBundleIcpBrasil } from '@nf-e/infrastructure/providers/sefaz-nfe.provider';

describe('bundle da ICP-Brasil', () => {
  it('e encontrado sem configuracao extra', () => {
    expect(localizarBundleIcpBrasil()).not.toBeNull();
  });

  it('tem os certificados das autoridades brasileiras', () => {
    const conteudo = readFileSync(localizarBundleIcpBrasil()!, 'utf8');
    const quantidade = conteudo.match(/-----BEGIN CERTIFICATE-----/g)?.length ?? 0;

    // Sem essas raízes o TLS com a SEFAZ falha em "unable to get local issuer
    // certificate": o Node só traz as CAs da Mozilla.
    expect(quantidade).toBeGreaterThan(100);
    expect(conteudo).toContain('-----END CERTIFICATE-----');
  });

  it('respeita o caminho informado por configuracao', () => {
    expect(localizarBundleIcpBrasil('/caminho/inexistente.pem')).not.toBe(
      '/caminho/inexistente.pem',
    );
  });
});
