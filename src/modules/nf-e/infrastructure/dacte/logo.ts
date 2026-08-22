import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ARQUIVO = 'logo-amw.jpeg';

/**
 * Diretórios candidatos: em dev os assets ficam ao lado do fonte; em build o
 * nest-cli copia `assets/` para dist mantendo a mesma estrutura.
 */
const CANDIDATOS = [
  join(__dirname, 'assets', ARQUIVO),
  join(process.cwd(), 'dist', 'modules', 'nf-e', 'infrastructure', 'dacte', 'assets', ARQUIVO),
  join(process.cwd(), 'src', 'modules', 'nf-e', 'infrastructure', 'dacte', 'assets', ARQUIVO),
];

let cache: string | null | undefined;

/** Logomarca do emitente como data URI, ou `undefined` se o arquivo não existir. */
export function logoEmitente(): string | undefined {
  if (cache === undefined) {
    const caminho = CANDIDATOS.find(existsSync);
    cache = caminho ? `data:image/jpeg;base64,${readFileSync(caminho).toString('base64')}` : null;
  }
  return cache ?? undefined;
}
