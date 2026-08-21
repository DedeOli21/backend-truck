import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { NfeProvider } from '@nf-e/domain/providers/nfe.provider';
import { montarChave } from '@nf-e/domain/value-objects/chave-acesso';
import { NfeService } from '@nf-e/application/services/nf-e.service';
import { NotConfiguredNfeProvider } from '@nf-e/infrastructure/providers/not-configured-nfe.provider';

const chave = montarChave({
  cUf: 35,
  ano: 26,
  mes: 8,
  cnpj: '11222333000181',
  modelo: 55,
  serie: 1,
  numero: 1042,
  tipoEmissao: 1,
  codigoNumerico: 12345678,
});

const providerConfigurado = (): NfeProvider => ({
  isConfigured: () => true,
  consultarPorChave: jest.fn(async () => ({
    situacao: 'AUTORIZADA' as const,
    protocolo: '135260000123456',
    dataAutorizacao: '2026-08-10T12:00:00.000Z',
    emitente: { cnpj: '11222333000181', razaoSocial: 'Transportes Exemplo LTDA' },
    destinatario: { cnpjCpf: '11222333000181', razaoSocial: 'Cliente Exemplo' },
    valorTotal: 4500,
    xmlUrl: null,
  })),
  consultarPorNumero: jest.fn(async () => ({
    situacao: 'AUTORIZADA' as const,
    protocolo: '135260000123456',
    dataAutorizacao: null,
    emitente: null,
    destinatario: null,
    valorTotal: null,
    xmlUrl: null,
  })),
});

describe('NfeService', () => {
  describe('sem provedor configurado', () => {
    let service: NfeService;

    beforeEach(() => {
      service = new NfeService(new NotConfiguredNfeProvider());
    });

    it('validar devolve os dados extraidos da chave, sem depender da SEFAZ', async () => {
      const resultado = await service.validarCodigo({ conteudo: chave });

      expect(resultado.valido).toBe(true);
      expect(resultado.origem).toBe('CHAVE');
      expect(resultado.documento.uf).toBe('SP');
      expect(resultado.documento.numero).toBe(1042);
      expect(resultado.documento.tipoDocumento).toBe('NFE');
    });

    it('validar aceita a URL do QR Code', async () => {
      const resultado = await service.validarCodigo({
        conteudo: `https://www.fazenda.sp.gov.br/nfce/qrcode?p=${chave}|2|1|1|ABC`,
      });

      expect(resultado.origem).toBe('QRCODE');
      expect(resultado.documento.chave).toBe(chave);
    });

    it('validar recusa conteudo sem chave', async () => {
      await expect(service.validarCodigo({ conteudo: 'nada aqui' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('consulta por chave devolve os dados da chave e sinaliza que a SEFAZ nao foi consultada', async () => {
      const resultado = await service.consultarPorChave(chave);

      expect(resultado.documento.numero).toBe(1042);
      expect(resultado.sefaz.consultado).toBe(false);
      expect(resultado.sefaz.motivo).toContain('certificado digital');
      expect(resultado.sefaz.situacao).toBeNull();
    });

    it('consulta por UF e numero falha explicitamente', async () => {
      await expect(service.consultarPorUfNumero('SP', 1042)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('consulta por UF invalida falha antes de chamar o provedor', async () => {
      await expect(service.consultarPorUfNumero('XX', 1042)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('consulta por numero invalido falha', async () => {
      await expect(service.consultarPorUfNumero('SP', 0)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('consulta por chave invalida falha', async () => {
      await expect(service.consultarPorChave('123')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('com provedor configurado', () => {
    let provider: NfeProvider;
    let service: NfeService;

    beforeEach(() => {
      provider = providerConfigurado();
      service = new NfeService(provider);
    });

    it('consulta por chave inclui a resposta da SEFAZ', async () => {
      const resultado = await service.consultarPorChave(chave);

      expect(provider.consultarPorChave).toHaveBeenCalled();
      expect(resultado.sefaz.consultado).toBe(true);
      expect(resultado.sefaz.situacao).toBe('AUTORIZADA');
      expect(resultado.sefaz.valorTotal).toBe(4500);
      expect(resultado.sefaz.motivo).toBeNull();
    });

    it('consulta por UF e numero delega ao provedor', async () => {
      const resultado = await service.consultarPorUfNumero('sp', 1042);

      expect(provider.consultarPorNumero).toHaveBeenCalledWith('SP', 1042);
      expect(resultado.sefaz.situacao).toBe('AUTORIZADA');
    });

    it('validar tambem consulta a SEFAZ quando ha provedor', async () => {
      const resultado = await service.validarCodigo({ conteudo: chave });

      expect(resultado.sefaz.consultado).toBe(true);
      expect(resultado.sefaz.situacao).toBe('AUTORIZADA');
    });
  });
});
