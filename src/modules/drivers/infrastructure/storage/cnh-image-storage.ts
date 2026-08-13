import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { mkdirSync } from 'fs';
import { diskStorage, type FileFilterCallback } from 'multer';
import { extname, join } from 'path';

export const CNH_UPLOADS_DIR =
  process.env.DRIVER_CNH_UPLOADS_DIR ?? join(process.cwd(), 'uploads', 'drivers', 'cnh');

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const cnhImageUploadOptions = {
  storage: diskStorage({
    destination: (_req: Request, _file: Express.Multer.File, callback: (error: Error | null, destination: string) => void) => {
      mkdirSync(CNH_UPLOADS_DIR, { recursive: true });
      callback(null, CNH_UPLOADS_DIR);
    },
    filename: (req: Request, file: Express.Multer.File, callback: (error: Error | null, filename: string) => void) => {
      callback(null, `${req.params.id}${extname(file.originalname)}`);
    },
  }),
  fileFilter: (_req: Request, file: Express.Multer.File, callback: FileFilterCallback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
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
