// Códigos de UF do IBGE, usados nos dois primeiros dígitos da chave de acesso.
export const UF_CODES: Record<string, number> = {
  RO: 11, AC: 12, AM: 13, RR: 14, PA: 15, AP: 16, TO: 17,
  MA: 21, PI: 22, CE: 23, RN: 24, PB: 25, PE: 26, AL: 27, SE: 28, BA: 29,
  MG: 31, ES: 32, RJ: 33, SP: 35,
  PR: 41, SC: 42, RS: 43,
  MS: 50, MT: 51, GO: 52, DF: 53,
};

const CODE_TO_UF = Object.fromEntries(
  Object.entries(UF_CODES).map(([uf, code]) => [code, uf]),
) as Record<number, string>;

export const isValidUf = (uf: string): boolean =>
  Object.prototype.hasOwnProperty.call(UF_CODES, uf.toUpperCase());

export const ufToCode = (uf: string): number | null => UF_CODES[uf.toUpperCase()] ?? null;

export const codeToUf = (code: number): string | null => CODE_TO_UF[code] ?? null;
