import multer from 'multer';
import sharp from 'sharp';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Tillat kun bildefiler
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new AppError('Only image files are allowed', 400));
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10 // Maks 10 bilder per opplasting
  },
});

// Middleware for å prosessere bilder med Sharp før opplasting
export const processImages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.files) {
      return next();
    }

    const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    const processedImages: Buffer[] = [];

    for (const file of files) {
      // Prosesser bildet med Sharp
      const processedBuffer = await sharp(file.buffer)
        .resize(1200, 1200, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .jpeg({ 
          quality: 85,
          progressive: true 
        })
        .toBuffer();

      processedImages.push(processedBuffer);
    }

    // Legg til prosesserte bilder i request objektet
    req.processedImages = processedImages;
    next();
  } catch (error) {
    next(new AppError('Error processing images', 500));
  }
};

// Utvid Request interface for å inkludere processedImages
declare global {
  namespace Express {
    interface Request {
      processedImages?: Buffer[];
    }
  }
}

export default uploadMiddleware;