import { montarChave } from '@nf-e/domain/value-objects/chave-acesso';
import { extrairChaveDeCodigo } from '@nf-e/domain/value-objects/qr-code';

const chave = montarChave({
  cUf: 35,
  ano: 26,
  mes: 8,
  cnpj: '11222333000181',
  modelo: 65,
  serie: 1,
  numero: 1042,
  tipoEmissao: 1,
  codigoNumerico: 12345678,
});

describe('extrairChaveDeCodigo', () => {
  it('le a chave crua do codigo de barras', () => {
    expect(extrairChaveDeCodigo(chave)).toEqual({ chave, origem: 'CHAVE' });
  });

  it('le a chave crua com separadores', () => {
    const formatada = chave.replace(/(\d{4})/g, '$1 ').trim();
    expect(extrairChaveDeCodigo(formatada).chave).toBe(chave);
  });

  it('le o QR Code de NFC-e, onde a chave e o primeiro campo do parametro p', () => {
    const url = `https://www.fazenda.sp.gov.br/nfce/qrcode?p=${chave}|2|1|1|ABCDEF0123456789`;
    expect(extrairChaveDeCodigo(url)).toEqual({ chave, origem: 'QRCODE' });
  });

  it('le o QR Code que traz a chave em chNFe', () => {
    const url = `https://www.nfe.fazenda.gov.br/portal/consulta.aspx?chNFe=${chave}&tpAmb=1`;
    expect(extrairChaveDeCodigo(url)).toEqual({ chave, origem: 'QRCODE' });
  });

  it('le a chave de uma URL sem parametro nomeado', () => {
    const url = `https://consulta.sefaz.mg.gov.br/nfce/${chave}`;
    expect(extrairChaveDeCodigo(url).chave).toBe(chave);
  });

  it('rejeita conteudo sem chave de 44 digitos', () => {
    expect(() => extrairChaveDeCodigo('https://exemplo.com/sem-chave')).toThrow(
      'Não foi possível extrair',
    );
  });

  it('rejeita conteudo vazio', () => {
    expect(() => extrairChaveDeCodigo('')).toThrow();
  });

  it('rejeita chave de 44 digitos com DV invalido', () => {
    const errada = chave.slice(0, 43) + ((Number(chave[43]) + 1) % 10);
    expect(() => extrairChaveDeCodigo(errada)).toThrow('dígito verificador');
  });
});
