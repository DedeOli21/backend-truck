import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { mkdirSync } from 'fs';
import { diskStorage, type FileFilterCallback } from 'multer';
import { extname, join } from 'path';

export const CNH_UPLOADS_DIR =
  process.env.DRIVER_CNH_UPLOADS_DIR ?? join(process.cwd(), 'uploads', 'drivers', 'cnh');

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const cnhImageUploadOptions = {
  storage: diskStorage({
    destination: (_req: Request, _file: Express.Multer.File, callback: (error: Error | null, destination: string) => void) => {
      mkdirSync(CNH_UPLOADS_DIR, { recursive: true });
      callback(null, CNH_UPLOADS_DIR);
    },
    filename: (req: Request, file: Express.Multer.File, callback: (error: Error | null, filename: string) => void) => {
      const id = String(req.params.id ?? '');
      if (!UUID_REGEX.test(id)) {
        callback(new BadRequestException('Id de motorista invalido'), '');
        return;
      }
      const extension = ALLOWED_MIME_TYPES[file.mimetype];
      if (!extension) {
        callback(new BadRequestException('Imagem deve ser JPEG, PNG ou WEBP'), '');
        return;
      }
      callback(null, `${id}${extension}`);
    },
  }),
  fileFilter: (_req: Request, file: Express.Multer.File, callback: FileFilterCallback) => {
    if (!ALLOWED_MIME_TYPES[file.mimetype]) {
      callback(new BadRequestException('Imagem deve ser JPEG, PNG ou WEBP'));
      return;
    }
    callback(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
};

export const mimeTypeFromPath = (path: string): string => {
  const ext = extname(path).toLowerCase();
  if (ext === '.png') {
    return 'image/png';
  }
  if (ext === '.webp') {
    return 'image/webp';
  }
  return 'image/jpeg';
};
