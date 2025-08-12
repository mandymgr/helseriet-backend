import { Request, Response, NextFunction } from 'express';
import { uploadToCloudinary, deleteFromCloudinary } from '@/config/cloudinary';
import prisma from '@/config/database';
import { AppError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';

class ProductController {
  async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json({
        success: true,
        message: 'Get products endpoint - to be implemented'
      });
    } catch (error) {
      next(error);
    }
  }

  async getProduct(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json({
        success: true,
        message: 'Get product endpoint - to be implemented'
      });
    } catch (error) {
      next(error);
    }
  }

  async searchProducts(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json({
        success: true,
        message: 'Search products endpoint - to be implemented'
      });
    } catch (error) {
      next(error);
    }
  }

  async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json({
        success: true,
        message: 'Create product endpoint - to be implemented'
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json({
        success: true,
        message: 'Update product endpoint - to be implemented'
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json({
        success: true,
        message: 'Delete product endpoint - to be implemented'
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadProductImages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { productId } = req.params;
      
      if (!productId) {
        throw new AppError('Product ID is required', 400);
      }
      
      if (!req.processedImages || req.processedImages.length === 0) {
        throw new AppError('No images provided', 400);
      }

      // Sjekk om produktet eksisterer
      const product = await prisma.product.findUnique({
        where: { id: productId }
      });

      if (!product) {
        throw new AppError('Product not found', 404);
      }

      const uploadPromises = req.processedImages.map(async (imageBuffer, index) => {
        const uploadResult = await uploadToCloudinary(imageBuffer, {
          folder: `helseriet/products/${productId}`,
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto' },
            { format: 'auto' }
          ]
        });

        // Lagre bildeinformasjon i databasen
        return prisma.productImage.create({
          data: {
            productId,
            url: uploadResult.secure_url,
            altText: `${product.name} - bilde ${index + 1}`,
            sortOrder: index
          }
        });
      });

      const savedImages = await Promise.all(uploadPromises);

      res.status(201).json({
        success: true,
        message: 'Images uploaded successfully',
        data: {
          images: savedImages
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteProductImage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { productId, imageId } = req.params;

      if (!productId || !imageId) {
        throw new AppError('Product ID and Image ID are required', 400);
      }

      // Finn bildet i databasen
      const image = await prisma.productImage.findFirst({
        where: {
          id: imageId,
          productId: productId
        }
      });

      if (!image) {
        throw new AppError('Image not found', 404);
      }

      // Ekstraherer public_id fra Cloudinary URL
      const urlParts = image.url.split('/');
      const publicIdWithExtension = urlParts.slice(-2).join('/'); // folder/filename.ext
      const publicId = publicIdWithExtension.split('.')[0]; // fjern filextension

      // Slett fra Cloudinary
      if (publicId) {
        await deleteFromCloudinary(publicId);
      }

      // Slett fra database
      await prisma.productImage.delete({
        where: { id: imageId }
      });

      res.status(200).json({
        success: true,
        message: 'Image deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

export const productController = new ProductController();
