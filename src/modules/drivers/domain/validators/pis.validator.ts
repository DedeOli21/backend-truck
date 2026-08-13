import { onlyDigits } from '@drivers/domain/validators/only-digits';

const WEIGHTS = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export const isValidPis = (rawPis: string): boolean => {
  const pis = onlyDigits(rawPis);
  if (pis.length !== 11 || /^(\d)\1{10}$/.test(pis)) {
    return false;
  }

  const digits = pis.split('').map(Number);
  const sum = digits.slice(0, 10).reduce((acc, digit, index) => acc + digit * WEIGHTS[index], 0);
  const remainder = sum % 11;
  const checkDigit = remainder < 2 ? 0 : 11 - remainder;

  return checkDigit === digits[10];
};
