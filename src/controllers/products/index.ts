import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { productService } from '@/services/product.service';

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get products with filtering and pagination
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, DRAFT, ARCHIVED]
 *           default: ACTIVE
 *         description: Filter by product status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in product name, description, or SKU
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, name, price, updatedAt]
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort direction
 *       - in: query
 *         name: isBundle
 *         schema:
 *           type: boolean
 *         description: Filter by bundle status
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *         description: Filter by featured status
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     products:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get single product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Invalid product ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/products/search:
 *   get:
 *     summary: Search products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     products:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       400:
 *         description: Search query too short or missing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create new product (Admin only)
 *     tags: [Products, Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Product name
 *               description:
 *                 type: string
 *                 nullable: true
 *                 description: Full product description
 *               shortDescription:
 *                 type: string
 *                 nullable: true
 *                 description: Brief product description
 *               sku:
 *                 type: string
 *                 description: Stock Keeping Unit (must be unique)
 *               price:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 description: Product price in NOK
 *               comparePrice:
 *                 type: number
 *                 format: float
 *                 nullable: true
 *                 description: Original price for comparison
 *               costPrice:
 *                 type: number
 *                 format: float
 *                 nullable: true
 *                 description: Cost price for profit calculations
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *                 description: Category ID
 *               quantity:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *                 description: Initial stock quantity
 *               weight:
 *                 type: number
 *                 format: float
 *                 nullable: true
 *                 description: Product weight for shipping
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Product tags for search and filtering
 *               metaTitle:
 *                 type: string
 *                 nullable: true
 *                 description: SEO meta title
 *               metaDescription:
 *                 type: string
 *                 nullable: true
 *                 description: SEO meta description
 *               trackQuantity:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to track inventory for this product
 *               lowStockThreshold:
 *                 type: integer
 *                 nullable: true
 *                 description: Quantity threshold for low stock alerts
 *             required: [name, sku, price, categoryId]
 *           example:
 *             name: "Vitamin D3 2000 IU"
 *             description: "High-quality vitamin D3 supplement for bone health and immune support"
 *             shortDescription: "Vitamin D3 for bone and immune health"
 *             sku: "VIT-D3-2000"
 *             price: 299
 *             comparePrice: 399
 *             categoryId: "uuid-category-id"
 *             quantity: 100
 *             tags: ["vitamin", "supplement", "bone health"]
 *             trackQuantity: true
 *             lowStockThreshold: 10
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Product created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     product:
 *                       $ref: '#/components/schemas/Product'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Product with this SKU already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

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
