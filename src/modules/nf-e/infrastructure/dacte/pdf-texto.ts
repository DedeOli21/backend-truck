import { BadRequestException } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';

/** Extrai a camada de texto do PDF. PDF digitalizado (imagem) devolve vazio. */
export const extrairTextoDoPdf = async (arquivo: Buffer): Promise<string> => {
  const leitor = new PDFParse({ data: arquivo });

  try {
    const resultado = await leitor.getText();
    return resultado.text ?? '';
  } catch (error) {
    const motivo = error instanceof Error ? error.message : String(error);
    throw new BadRequestException(`Não foi possível ler o PDF: ${motivo}`);
  } finally {
    await leitor.destroy();
  }
};
