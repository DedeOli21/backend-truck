import { PixKeyType } from '@database/typeorm/entities/enums';
import { isValidCnpj } from '@drivers/domain/validators/cnpj.validator';
import { isValidCpf } from '@drivers/domain/validators/cpf.validator';
import { onlyDigits } from '@drivers/domain/validators/only-digits';
import { isValidPis } from '@drivers/domain/validators/pis.validator';
import { detectPixKeyType, isValidPixKey } from '@drivers/domain/validators/pix-key.validator';

describe('onlyDigits', () => {
  it('remove caracteres nao numericos', () => {
    expect(onlyDigits('123.456-78')).toBe('12345678');
  });
});

describe('isValidCpf', () => {
  it('aceita CPF valido', () => {
    expect(isValidCpf('52998224725')).toBe(true);
  });

  it('rejeita CPF com digitos verificadores errados', () => {
    expect(isValidCpf('52998224700')).toBe(false);
  });

  it('rejeita CPF com todos os digitos iguais', () => {
    expect(isValidCpf('11111111111')).toBe(false);
  });

  it('rejeita CPF com tamanho errado', () => {
    expect(isValidCpf('123')).toBe(false);
  });
});

describe('isValidCnpj', () => {
  it('aceita CNPJ valido', () => {
    expect(isValidCnpj('11444777000161')).toBe(true);
  });

  it('rejeita CNPJ com digito verificador errado', () => {
    expect(isValidCnpj('11444777000199')).toBe(false);
  });
});

describe('isValidPis', () => {
  it('aceita PIS valido', () => {
    expect(isValidPis('12056275319')).toBe(true);
  });

  it('rejeita PIS com digito verificador errado', () => {
    expect(isValidPis('12056275310')).toBe(false);
  });
});

describe('detectPixKeyType', () => {
  it('detecta email', () => {
    expect(detectPixKeyType('motorista@example.com')).toBe(PixKeyType.EMAIL);
  });

  it('detecta CPF pelo tamanho', () => {
    expect(detectPixKeyType('52998224725')).toBe(PixKeyType.CPF);
  });

  it('detecta CNPJ pelo tamanho', () => {
    expect(detectPixKeyType('11444777000161')).toBe(PixKeyType.CNPJ);
  });

  it('detecta telefone com prefixo +55', () => {
    expect(detectPixKeyType('+5511999998888')).toBe(PixKeyType.PHONE);
  });

  it('detecta chave aleatoria (uuid)', () => {
    expect(detectPixKeyType('550e8400-e29b-41d4-a716-446655440000')).toBe(PixKeyType.RANDOM);
  });

  it('retorna null para formato nao reconhecido', () => {
    expect(detectPixKeyType('abc')).toBeNull();
  });
});

describe('isValidPixKey', () => {
  it('valida CPF invalido mesmo com tamanho correto', () => {
    expect(isValidPixKey('11111111111', PixKeyType.CPF)).toBe(false);
  });

  it('valida email valido', () => {
    expect(isValidPixKey('motorista@example.com', PixKeyType.EMAIL)).toBe(true);
  });
});
