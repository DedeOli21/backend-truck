import { PixKeyType } from '@database/typeorm/entities/enums';
import { isValidCnpj } from '@drivers/domain/validators/cnpj.validator';
import { isValidCpf } from '@drivers/domain/validators/cpf.validator';
import { onlyDigits } from '@drivers/domain/validators/only-digits';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RANDOM_KEY_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const detectPixKeyType = (rawKey: string): PixKeyType | null => {
  const key = rawKey.trim();
  const digits = onlyDigits(key);

  if (EMAIL_REGEX.test(key)) {
    return PixKeyType.EMAIL;
  }
  if (RANDOM_KEY_REGEX.test(key)) {
    return PixKeyType.RANDOM;
  }
  if (key.startsWith('+') && digits.length >= 12 && digits.length <= 13) {
    return PixKeyType.PHONE;
  }
  if (digits.length === 11) {
    return PixKeyType.CPF;
  }
  if (digits.length === 14) {
    return PixKeyType.CNPJ;
  }
  return null;
};

export const isValidPixKey = (rawKey: string, type: PixKeyType): boolean => {
  const key = rawKey.trim();
  const digits = onlyDigits(key);

  switch (type) {
    case PixKeyType.EMAIL:
      return EMAIL_REGEX.test(key);
    case PixKeyType.RANDOM:
      return RANDOM_KEY_REGEX.test(key);
    case PixKeyType.PHONE:
      return key.startsWith('+') && digits.length >= 12 && digits.length <= 13;
    case PixKeyType.CPF:
      return digits.length === 11 && isValidCpf(digits);
    case PixKeyType.CNPJ:
      return digits.length === 14 && isValidCnpj(digits);
    default:
      return false;
  }
};
