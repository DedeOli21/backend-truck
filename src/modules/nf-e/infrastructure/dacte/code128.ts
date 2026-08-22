/**
 * Code 128 (subconjunto C) para a representação numérica da chave de acesso.
 *
 * O DACTE exige o código de barras linear da chave de 44 dígitos. Como todos os
 * caracteres são numéricos, o subconjunto C é o único usado: cada símbolo
 * codifica dois dígitos, o que mantém a barra dentro da largura da coluna.
 */

// Larguras de barra/espaço de cada símbolo (índices 0..106; 106 = STOP).
const PADROES = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

const START_C = 105;
const STOP = 106;

/** Sequência de larguras alternando barra/espaço, começando por barra. */
export const larguras128C = (digitos: string): number[] => {
  if (!/^\d+$/.test(digitos) || digitos.length % 2 !== 0) {
    throw new Error('Code 128C exige uma quantidade par de dígitos.');
  }

  const valores = [START_C];
  for (let i = 0; i < digitos.length; i += 2) {
    valores.push(Number(digitos.slice(i, i + 2)));
  }

  const soma = valores.reduce((acc, valor, indice) => acc + valor * (indice === 0 ? 1 : indice), 0);
  valores.push(soma % 103);
  valores.push(STOP);

  return valores.flatMap((valor) => [...PADROES[valor]].map(Number));
};

/** Número de módulos (larguras unitárias) ocupados pelo código. */
export const modulos128C = (digitos: string): number =>
  larguras128C(digitos).reduce((acc, largura) => acc + largura, 0);

/**
 * Retorna os retângulos pretos do código de barras, prontos para o canvas do
 * pdfmake. `modulo` é a largura de um módulo em pontos.
 */
export const barras128C = (
  digitos: string,
  modulo: number,
  altura: number,
): { type: 'rect'; x: number; y: number; w: number; h: number; color: string }[] => {
  const larguras = larguras128C(digitos);
  const retangulos: { type: 'rect'; x: number; y: number; w: number; h: number; color: string }[] = [];
  let x = 0;

  larguras.forEach((largura, indice) => {
    const w = largura * modulo;
    if (indice % 2 === 0) {
      retangulos.push({ type: 'rect', x, y: 0, w, h: altura, color: '#000000' });
    }
    x += w;
  });

  return retangulos;
};
