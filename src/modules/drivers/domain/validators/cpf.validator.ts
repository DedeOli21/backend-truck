import { onlyDigits } from '@drivers/domain/validators/only-digits';

const calcCheckDigit = (base: number[]): number => {
  let sum = 0;
  let weight = base.length + 1;
  for (const digit of base) {
    sum += digit * weight;
    weight -= 1;
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
};

export const isValidCpf = (rawCpf: string): boolean => {
  const cpf = onlyDigits(rawCpf);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const digits = cpf.split('').map(Number);
  const firstCheckDigit = calcCheckDigit(digits.slice(0, 9));
  const secondCheckDigit = calcCheckDigit([...digits.slice(0, 9), firstCheckDigit]);

  return firstCheckDigit === digits[9] && secondCheckDigit === digits[10];
};
