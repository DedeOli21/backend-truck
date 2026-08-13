import { onlyDigits } from '@drivers/domain/validators/only-digits';

const FIRST_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const SECOND_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

const calcCheckDigit = (base: number[], weights: number[]): number => {
  const sum = base.reduce((acc, digit, index) => acc + digit * weights[index], 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
};

export const isValidCnpj = (rawCnpj: string): boolean => {
  const cnpj = onlyDigits(rawCnpj);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }

  const digits = cnpj.split('').map(Number);
  const firstCheckDigit = calcCheckDigit(digits.slice(0, 12), FIRST_WEIGHTS);
  const secondCheckDigit = calcCheckDigit([...digits.slice(0, 12), firstCheckDigit], SECOND_WEIGHTS);

  return firstCheckDigit === digits[12] && secondCheckDigit === digits[13];
};
