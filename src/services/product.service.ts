import prisma from '@/config/database';
import { uploadToCloudinary, deleteFromCloudinary } from '@/config/cloudinary';
import { AppError, ErrorCodes, ErrorSeverity } from '@/middleware/errorHandler';
import { ProductStatus } from '@prisma/client';

interface ProductFilters {
  status?: string;
  category?: string;
  search?: string;
  isBundle?: boolean;
  featured?: boolean;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface CreateProductData {
  name: string;
  description?: string;
  shortDescription?: string;
  sku: string;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  categoryId: string;
  quantity?: number;
  weight?: number;
  dimensions?: any;
  tags?: string[];
  metaTitle?: string;
  metaDescription?: string;
  trackQuantity?: boolean;
  lowStockThreshold?: number;
}

class ProductService {
  // Get products with filtering and pagination
  async getProducts(filters: ProductFilters = {}, pagination: PaginationOptions = {}) {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = pagination;

    const skip = (Number(page) - 1) * Number(limit);

    // Build filter conditions
    const where: any = {
      isActive: true
    };

    if (filters.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    if (filters.category) {
      where.categoryId = filters.category;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    if (filters.isBundle !== undefined) {
      where.isBundle = filters.isBundle;
    }

    if (filters.featured !== undefined) {
      where.isFeatured = filters.featured;
    }

    try {
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
              select: { id: true, url: true, altText: true, sortOrder: true, imageType: true, isPrimary: true },
              where: { imageType: 'FRONT' },
              orderBy: { isPrimary: 'desc' },
              take: 1
            },
            _count: {
              select: { reviews: true }
            }
          }
        }),
        prisma.product.count({ where })
      ]);

      // Calculate average ratings
      const productsWithRatings = await this.addRatingsToProducts(products);

      return {
        products: productsWithRatings,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / Number(limit))
        }
      };
    } catch (error: any) {
      throw new AppError(
        'Feil ved henting av produkter', 
        500, 
        ErrorCodes.DATABASE_ERROR,
        [{ message: error.message }],
        ErrorSeverity.HIGH
      );
    }
  }

  // Get single product by ID
  async getProductById(id: string) {
    if (!id) {
      throw new AppError(
        'Produkt ID er påkrevd', 
        400, 
        ErrorCodes.VALIDATION_ERROR,
        [{ message: 'Product ID is required' }],
        ErrorSeverity.LOW
      );
    }

    try {
      const product = await prisma.product.findUnique({
        where: { 
          id,
          isActive: true,
          status: 'ACTIVE'
        },
        include: {
          category: {
            select: { id: true, name: true, slug: true }
          },
          images: {
            select: { 
              id: true, 
              url: true, 
              altText: true, 
              sortOrder: true,
              imageType: true,
              isPrimary: true
            },
            orderBy: [
              { isPrimary: 'desc' },
              { imageType: 'asc' },
              { sortOrder: 'asc' }
            ]
          },
          reviews: {
            select: {
              id: true,
              rating: true,
              title: true,
              comment: true,
              createdAt: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          _count: {
            select: { reviews: true }
          },
          bundleItems: {
            select: {
              id: true,
              quantity: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  images: {
                    select: { url: true, altText: true },
                    where: { imageType: 'FRONT' },
                    take: 1
                  }
                }
              }
            }
          }
        }
      });

      if (!product) {
        throw new AppError(
          'Produkt ikke funnet', 
          404, 
          ErrorCodes.NOT_FOUND,
          [{ message: 'Product not found' }],
          ErrorSeverity.LOW
        );
      }

      // Calculate average rating
      const avgRating = await this.calculateAverageRating(product.id);

      return {
        ...product,
        averageRating: avgRating,
        totalReviews: product._count.reviews
      };
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'Feil ved henting av produkt', 
        500, 
        ErrorCodes.DATABASE_ERROR,
        [{ message: error.message }],
        ErrorSeverity.HIGH
      );
    }
  }

  // Get product by slug
  async getProductBySlug(slug: string) {
    if (!slug) {
      throw new AppError(
        'Produkt slug er påkrevd', 
        400, 
        ErrorCodes.VALIDATION_ERROR,
        [{ message: 'Product slug is required' }],
        ErrorSeverity.LOW
      );
    }

    try {
      const product = await prisma.product.findUnique({
        where: { 
          slug,
          isActive: true,
          status: 'ACTIVE'
        },
        include: {
          category: {
            select: { id: true, name: true, slug: true }
          },
          images: {
            select: { 
              id: true, 
              url: true, 
              altText: true, 
              sortOrder: true,
              imageType: true,
              isPrimary: true
            },
            orderBy: [
              { isPrimary: 'desc' },
              { imageType: 'asc' },
              { sortOrder: 'asc' }
            ]
          }
        }
      });

      if (!product) {
        throw new AppError(
          'Produkt ikke funnet', 
          404, 
          ErrorCodes.NOT_FOUND,
          [{ message: 'Product not found' }],
          ErrorSeverity.LOW
        );
      }

      return product;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'Feil ved henting av produkt', 
        500, 
        ErrorCodes.DATABASE_ERROR,
        [{ message: error.message }],
        ErrorSeverity.HIGH
      );
    }
  }

  // Create new product
  async createProduct(productData: CreateProductData) {
    // Validate required fields
    if (!productData.name || !productData.sku || !productData.price || !productData.categoryId) {
      throw new AppError(
        'Name, SKU, price, and category are required', 
        400, 
        ErrorCodes.VALIDATION_ERROR,
        [{ message: 'Required fields missing' }],
        ErrorSeverity.LOW
      );
    }

    try {
      // Check if SKU already exists
      const existingSku = await prisma.product.findUnique({
        where: { sku: productData.sku }
      });

      if (existingSku) {
        throw new AppError(
          'SKU already exists', 
          400, 
          ErrorCodes.CONFLICT,
          [{ message: 'A product with this SKU already exists' }],
          ErrorSeverity.LOW
        );
      }

      // Generate unique slug
      const slug = await this.generateUniqueSlug(productData.name);

      // Verify category exists
      const category = await prisma.category.findUnique({
        where: { id: productData.categoryId }
      });

      if (!category) {
        throw new AppError(
          'Category not found', 
          400, 
          ErrorCodes.NOT_FOUND,
          [{ message: 'The specified category does not exist' }],
          ErrorSeverity.LOW
        );
      }

      // Create product
      const product = await prisma.product.create({
        data: {
          name: productData.name,
          slug,
          description: productData.description || null,
          shortDescription: productData.shortDescription || null,
          sku: productData.sku,
          price: Number(productData.price),
          comparePrice: productData.comparePrice ? Number(productData.comparePrice) : null,
          costPrice: productData.costPrice ? Number(productData.costPrice) : null,
          categoryId: productData.categoryId,
          quantity: Number(productData.quantity || 0),
          weight: productData.weight ? Number(productData.weight) : null,
          dimensions: productData.dimensions || null,
          tags: productData.tags || [],
          metaTitle: productData.metaTitle || null,
          metaDescription: productData.metaDescription || null,
          trackQuantity: productData.trackQuantity !== undefined ? productData.trackQuantity : true,
          lowStockThreshold: productData.lowStockThreshold ? Number(productData.lowStockThreshold) : null,
          status: ProductStatus.DRAFT // New products start as draft
        },
        include: {
          category: {
            select: { id: true, name: true, slug: true }
          },
          images: true
        }
      });

      return product;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'Feil ved opprettelse av produkt', 
        500, 
        ErrorCodes.DATABASE_ERROR,
        [{ message: error.message }],
        ErrorSeverity.HIGH
      );
    }
  }

  // Upload product images
  async uploadProductImages(productId: string, imageBuffers: Buffer[]) {
    if (!productId) {
      throw new AppError(
        'Product ID is required', 
        400, 
        ErrorCodes.VALIDATION_ERROR,
        [{ message: 'Product ID is required' }],
        ErrorSeverity.LOW
      );
    }

    if (!imageBuffers || imageBuffers.length === 0) {
      throw new AppError(
        'No images provided', 
        400, 
        ErrorCodes.VALIDATION_ERROR,
        [{ message: 'At least one image is required' }],
        ErrorSeverity.LOW
      );
    }

    try {
      // Check if product exists
      const product = await prisma.product.findUnique({
        where: { id: productId }
      });

      if (!product) {
        throw new AppError(
          'Product not found', 
          404, 
          ErrorCodes.NOT_FOUND,
          [{ message: 'Product not found' }],
          ErrorSeverity.LOW
        );
      }

      const uploadPromises = imageBuffers.map(async (imageBuffer, index) => {
        const uploadResult = await uploadToCloudinary(imageBuffer, {
          folder: `helseriet/products/${productId}`,
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto' },
            { format: 'auto' }
          ]
        });

        // Save image info to database
        return prisma.productImage.create({
          data: {
            productId,
            url: uploadResult.secure_url,
            altText: `${product.name} - bilde ${index + 1}`,
            sortOrder: index,
            imageType: index === 0 ? 'FRONT' : 'GENERAL', // First image is assumed to be front
            isPrimary: index === 0
          }
        });
      });

      const savedImages = await Promise.all(uploadPromises);
      return savedImages;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'Feil ved opplasting av bilder', 
        500, 
        ErrorCodes.INTERNAL_SERVER_ERROR,
        [{ message: error.message }],
        ErrorSeverity.HIGH
      );
    }
  }

  // Delete product image
  async deleteProductImage(productId: string, imageId: string) {
    if (!productId || !imageId) {
      throw new AppError(
        'Product ID and Image ID are required', 
        400, 
        ErrorCodes.VALIDATION_ERROR,
        [{ message: 'Product ID and Image ID are required' }],
        ErrorSeverity.LOW
      );
    }

    try {
      // Find the image in database
      const image = await prisma.productImage.findFirst({
        where: {
          id: imageId,
          productId: productId
        }
      });

      if (!image) {
        throw new AppError(
          'Image not found', 
          404, 
          ErrorCodes.NOT_FOUND,
          [{ message: 'Image not found' }],
          ErrorSeverity.LOW
        );
      }

      // Extract public_id from Cloudinary URL
      const urlParts = image.url.split('/');
      const publicIdWithExtension = urlParts.slice(-2).join('/'); // folder/filename.ext
      const publicId = publicIdWithExtension.split('.')[0]; // remove file extension

      // Delete from Cloudinary
      if (publicId) {
        await deleteFromCloudinary(publicId);
      }

      // Delete from database
      await prisma.productImage.delete({
        where: { id: imageId }
      });

      return { success: true };
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        'Feil ved sletting av bilde', 
        500, 
        ErrorCodes.INTERNAL_SERVER_ERROR,
        [{ message: error.message }],
        ErrorSeverity.HIGH
      );
    }
  }

  // Helper method: Generate unique slug
  private async generateUniqueSlug(name: string): Promise<string> {
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

    return finalSlug;
  }

  // Helper method: Calculate average rating
  private async calculateAverageRating(productId: string): Promise<number> {
    const avgRating = await prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true }
    });

    return avgRating._avg.rating ? Number(avgRating._avg.rating.toFixed(1)) : 0;
  }

  // Helper method: Add ratings to products
  private async addRatingsToProducts(products: any[]): Promise<any[]> {
    return Promise.all(
      products.map(async (product) => {
        const avgRating = await this.calculateAverageRating(product.id);
        return {
          ...product,
          avgRating,
          reviewCount: product._count.reviews
        };
      })
    );
  }
}

export const productService = new ProductService();