import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface.js';

export const VOUCHERS_UPLOAD_DIR = join(process.cwd(), 'uploads', 'vouchers');

export function ensureUploadsDirExists(): void {
  if (!existsSync(VOUCHERS_UPLOAD_DIR)) {
    mkdirSync(VOUCHERS_UPLOAD_DIR, { recursive: true });
  }
}

export const voucherMulterOptions: MulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      ensureUploadsDirExists();
      cb(null, VOUCHERS_UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase();
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const safeFilename = `voucher-${uniqueSuffix}${ext}`;
      cb(null, safeFilename);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // Máximo 5 MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        new BadRequestException(
          'Tipo de archivo no permitido. Solo se admiten imágenes (JPG, PNG, WEBP) o documentos PDF',
        ),
        false,
      );
    }

    cb(null, true);
  },
};
