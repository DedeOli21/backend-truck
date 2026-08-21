import { calcularDigitoVerificador, montarChave, parseChaveAcesso } from '@nf-e/domain/value-objects/chave-acesso';

// Chave montada com DV calculado, para o teste não depender de nota real.
const partes = {
  cUf: 35,
  ano: 26,
  mes: 8,
  cnpj: '11222333000181',
  modelo: 55,
  serie: 1,
  numero: 1042,
  tipoEmissao: 1,
  codigoNumerico: 12345678,
};

const chaveValida = montarChave(partes);

describe('calcularDigitoVerificador', () => {
  it('usa modulo 11 sobre os 43 primeiros digitos', () => {
    const base = chaveValida.slice(0, 43);
    expect(calcularDigitoVerificador(base)).toBe(Number(chaveValida[43]));
  });

  it('rejeita base com tamanho diferente de 43', () => {
    expect(() => calcularDigitoVerificador('123')).toThrow();
  });
});

describe('parseChaveAcesso', () => {
  it('extrai os campos da chave', () => {
    const parsed = parseChaveAcesso(chaveValida);

    expect(parsed.uf).toBe('SP');
    expect(parsed.cnpjEmitente).toBe('11222333000181');
    expect(parsed.modelo).toBe(55);
    expect(parsed.serie).toBe(1);
    expect(parsed.numero).toBe(1042);
    expect(parsed.anoEmissao).toBe(2026);
    expect(parsed.mesEmissao).toBe(8);
    expect(parsed.tipoDocumento).toBe('NFE');
  });

  it('identifica NFC-e pelo modelo 65', () => {
    const chave = montarChave({ ...partes, modelo: 65 });
    expect(parseChaveAcesso(chave).tipoDocumento).toBe('NFCE');
  });

  it('aceita chave com espacos e pontos', () => {
    const formatada = chaveValida.replace(/(\d{4})/g, '$1 ').trim();
    expect(parseChaveAcesso(formatada).numero).toBe(1042);
  });

  it('rejeita chave com tamanho invalido', () => {
    expect(() => parseChaveAcesso('123')).toThrow('44 dígitos');
  });

  it('rejeita chave com digito verificador errado', () => {
    const errada = chaveValida.slice(0, 43) + ((Number(chaveValida[43]) + 1) % 10);
    expect(() => parseChaveAcesso(errada)).toThrow('dígito verificador');
  });

  it('rejeita chave com UF inexistente', () => {
    const chave = montarChave({ ...partes, cUf: 99 });
    expect(() => parseChaveAcesso(chave)).toThrow('UF');
  });

  it('rejeita chave com modelo diferente de 55 ou 65', () => {
    const chave = montarChave({ ...partes, modelo: 57 });
    expect(() => parseChaveAcesso(chave)).toThrow('modelo');
  });

  it('rejeita chave com CNPJ invalido', () => {
    const chave = montarChave({ ...partes, cnpj: '11111111111111' });
    expect(() => parseChaveAcesso(chave)).toThrow('CNPJ');
  });

  it('rejeita chave com mes fora do intervalo', () => {
    const chave = montarChave({ ...partes, mes: 13 });
    expect(() => parseChaveAcesso(chave)).toThrow('mês');
  });
});
