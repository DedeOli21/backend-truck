import { criarNfeProvider } from '@nf-e/infrastructure/providers/nfe-provider.factory';
import { NotConfiguredNfeProvider } from '@nf-e/infrastructure/providers/not-configured-nfe.provider';
import { SefazNfeProvider } from '@nf-e/infrastructure/providers/sefaz-nfe.provider';

describe('criarNfeProvider', () => {
  // package.json existe sempre e serve de arquivo qualquer para o teste do caminho.
  const certExistente = 'package.json';

  it('cai no NotConfigured sem caminho de certificado', () => {
    expect(criarNfeProvider({ NFE_CERT_PASSWORD: 'x' })).toBeInstanceOf(NotConfiguredNfeProvider);
  });

  it('cai no NotConfigured sem senha', () => {
    expect(criarNfeProvider({ NFE_CERT_PATH: certExistente })).toBeInstanceOf(
      NotConfiguredNfeProvider,
    );
  });

  it('cai no NotConfigured quando o arquivo nao existe', () => {
    const provider = criarNfeProvider({
      NFE_CERT_PATH: '/caminho/que/nao/existe.pfx',
      NFE_CERT_PASSWORD: 'x',
    });

    expect(provider).toBeInstanceOf(NotConfiguredNfeProvider);
    expect(provider.isConfigured()).toBe(false);
  });

  it('entrega o provider da SEFAZ quando tudo esta presente', () => {
    const provider = criarNfeProvider({
      NFE_CERT_PATH: certExistente,
      NFE_CERT_PASSWORD: 'x',
    });

    expect(provider).toBeInstanceOf(SefazNfeProvider);
    expect(provider.isConfigured()).toBe(true);
  });

  it('usa homologacao quando NFE_AMBIENTE=2', () => {
    const provider = criarNfeProvider({
      NFE_CERT_PATH: certExistente,
      NFE_CERT_PASSWORD: 'x',
      NFE_AMBIENTE: '2',
    }) as SefazNfeProvider;

    expect(provider['config'].ambiente).toBe(2);
  });

  it('producao e o padrao', () => {
    const provider = criarNfeProvider({
      NFE_CERT_PATH: certExistente,
      NFE_CERT_PASSWORD: 'x',
    }) as SefazNfeProvider;

    expect(provider['config'].ambiente).toBe(1);
  });
});
