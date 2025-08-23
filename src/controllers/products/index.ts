import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { productService } from '@/services/product.service';

class ProductController {
  async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        category, 
        status = 'ACTIVE',
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        isBundle,
        featured
      } = req.query;

      const filters: any = {
        status: status as string,
        category: category as string,
        search: search as string
      };

      if (isBundle) {
        filters.isBundle = isBundle === 'true';
      }

      if (featured) {
        filters.featured = featured === 'true';
      }

      const pagination = {
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      };

      const result = await productService.getProducts(filters, pagination);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      if (!id) {
        throw new Error('Product ID is required');
      }
      
      const product = await productService.getProductById(id);

      res.status(200).json({
        success: true,
        data: product
      });
    } catch (error) {
      next(error);
    }
  }

  async searchProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { q: query, page = 1, limit = 10 } = req.query;
      
      const filters = {};
      const pagination = {
        page: Number(page),
        limit: Number(limit)
      };

      const result = await productService.searchProducts(query as string, filters, pagination);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async createProduct(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const productData = req.body;
      const product = await productService.createProduct(productData);

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: { product }
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      if (!id) {
        throw new Error('Product ID is required');
      }
      
      const updateData = req.body;
      const product = await productService.updateProduct(id, updateData);

      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: { product }
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      if (!id) {
        throw new Error('Product ID is required');
      }
      
      await productService.deleteProduct(id);

      res.status(200).json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async uploadProductImages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id: productId } = req.params;
      
      if (!productId) {
        throw new Error('Product ID is required');
      }
      
      if (!req.processedImages || req.processedImages.length === 0) {
        throw new Error('No images provided');
      }

      const savedImages = await productService.uploadProductImages(productId, req.processedImages);

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
        throw new Error('Product ID and Image ID are required');
      }
      
      await productService.deleteProductImage(productId, imageId);

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
