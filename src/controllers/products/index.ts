import { Request, Response, NextFunction } from 'express';
import { uploadToCloudinary, deleteFromCloudinary } from '@/config/cloudinary';
import prisma from '@/config/database';
import { AppError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';

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
        sortOrder = 'desc'
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      // Build filter conditions
      const where: any = {
        isActive: true
      };

      if (status && status !== 'all') {
        where.status = status;
      }

      if (category) {
        where.categoryId = category;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Get products with category and images
      const [products, totalCount] = await Promise.all([
        prisma.product.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: {
            [sortBy as string]: sortOrder
          },
          include: {
            category: {
              select: { id: true, name: true, slug: true }
            },
            images: {
              select: { id: true, url: true, altText: true, sortOrder: true },
              orderBy: { sortOrder: 'asc' }
            },
            _count: {
              select: { reviews: true }
            }
          }
        }),
        prisma.product.count({ where })
      ]);

      // Calculate average ratings
      const productsWithRatings = await Promise.all(
        products.map(async (product) => {
          const avgRating = await prisma.review.aggregate({
            where: { productId: product.id },
            _avg: { rating: true }
          });

          return {
            ...product,
            avgRating: avgRating._avg.rating ? Number(avgRating._avg.rating.toFixed(1)) : null,
            reviewCount: product._count.reviews
          };
        })
      );

      res.status(200).json({
        success: true,
        data: {
          products: productsWithRatings,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / Number(limit))
          }
        }
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

  async createProduct(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const {
        name,
        description,
        shortDescription,
        sku,
        price,
        comparePrice,
        costPrice,
        categoryId,
        quantity = 0,
        weight,
        dimensions,
        tags = [],
        metaTitle,
        metaDescription,
        trackQuantity = true,
        lowStockThreshold
      } = req.body;

      // Validate required fields
      if (!name || !sku || !price || !categoryId) {
        throw new AppError('Name, SKU, price, and category are required', 400);
      }

      // Check if SKU already exists
      const existingSku = await prisma.product.findUnique({
        where: { sku }
      });

      if (existingSku) {
        throw new AppError('SKU already exists', 400);
      }

      // Generate slug from name
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      // Check if slug exists and make it unique
      let finalSlug = slug;
      let counter = 1;
      while (await prisma.product.findUnique({ where: { slug: finalSlug } })) {
        finalSlug = `${slug}-${counter}`;
        counter++;
      }

      // Verify category exists
      const category = await prisma.category.findUnique({
        where: { id: categoryId }
      });

      if (!category) {
        throw new AppError('Category not found', 400);
      }

      // Create product
      const product = await prisma.product.create({
        data: {
          name,
          slug: finalSlug,
          description,
          shortDescription,
          sku,
          price: Number(price),
          comparePrice: comparePrice ? Number(comparePrice) : null,
          costPrice: costPrice ? Number(costPrice) : null,
          categoryId,
          quantity: Number(quantity),
          weight: weight ? Number(weight) : null,
          dimensions,
          tags,
          metaTitle,
          metaDescription,
          trackQuantity,
          lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : null,
          status: 'DRAFT' // New products start as draft
        },
        include: {
          category: {
            select: { id: true, name: true, slug: true }
          },
          images: true
        }
      });

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
