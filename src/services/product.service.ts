import { uploadToCloudinary, deleteFromCloudinary } from '@/config/cloudinary';
import { ProductStatus } from '@prisma/client';
import { BaseService } from './base.service';

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

interface UpdateProductData extends Partial<CreateProductData> {}

class ProductService extends BaseService {
  /**
   * Get products with filtering and pagination
   */
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

    return this.handleDatabaseOperation(async () => {
      // Get products with category and images
      const [products, totalCount] = await Promise.all([
        this.db.product.findMany({
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
              orderBy: { sortOrder: 'asc' }
            },
            _count: {
              select: { reviews: true }
            }
          }
        }),
        this.db.product.count({ where })
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
    }, 'Failed to fetch products');
  }

  /**
   * Get single product by ID
   */
  async getProductById(id: string) {
    this.validateId(id, 'Product');

    return this.handleDatabaseOperation(async () => {
      const product = await this.ensureExists(
        () => this.db.product.findUnique({
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
        }),
        'Product'
      );

      // Calculate average rating
      const avgRating = await this.calculateAverageRating(product.id);

      return {
        ...product,
        averageRating: avgRating,
        totalReviews: product._count.reviews
      };
    }, 'Failed to get product');
  }

  /**
   * Get product by slug
   */
  async getProductBySlug(slug: string) {
    if (!slug) {
      throw this.createValidationError('Product slug is required');
    }

    return this.handleDatabaseOperation(async () => {
      const product = await this.ensureExists(
        () => this.db.product.findUnique({
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
        }),
        'Product'
      );

      return product;
    }, 'Failed to get product by slug');
  }

  /**
   * Create new product
   */
  async createProduct(productData: CreateProductData) {
    this.validateRequiredFields(productData, ['name', 'sku', 'price', 'categoryId']);

    return this.handleDatabaseOperation(async () => {
      // Check if SKU already exists
      const existingSku = await this.db.product.findUnique({
        where: { sku: productData.sku }
      });

      if (existingSku) {
        throw this.createConflictError('A product with this SKU already exists', 'sku');
      }

      // Generate unique slug
      const slug = await this.generateUniqueSlug(productData.name);

      // Verify category exists
      await this.ensureExists(
        () => this.db.category.findUnique({ where: { id: productData.categoryId } }),
        'Category'
      );

      // Create product
      const product = await this.db.product.create({
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
          trackQuantity: productData.trackQuantity ?? true,
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
    }, 'Failed to create product');
  }

  /**
   * Update product
   */
  async updateProduct(id: string, updateData: UpdateProductData) {
    this.validateId(id, 'Product');

    return this.handleDatabaseOperation(async () => {
      // Ensure product exists
      await this.ensureExists(
        () => this.db.product.findUnique({ where: { id } }),
        'Product'
      );

      // If SKU is being updated, check for conflicts
      if (updateData.sku) {
        const existingSku = await this.db.product.findFirst({
          where: { 
            sku: updateData.sku,
            NOT: { id }
          }
        });

        if (existingSku) {
          throw this.createConflictError('A product with this SKU already exists', 'sku');
        }
      }

      // If name is being updated, generate new slug
      let slug: string | undefined;
      if (updateData.name) {
        slug = await this.generateUniqueSlug(updateData.name, id);
      }

      // If category is being updated, verify it exists
      if (updateData.categoryId) {
        await this.ensureExists(
          () => this.db.category.findUnique({ where: { id: updateData.categoryId! } }),
          'Category'
        );
      }

      // Prepare update data
      const updateFields: any = { ...updateData };
      
      if (slug) updateFields.slug = slug;
      if (updateData.price !== undefined) updateFields.price = Number(updateData.price);
      if (updateData.comparePrice !== undefined) updateFields.comparePrice = Number(updateData.comparePrice);
      if (updateData.costPrice !== undefined) updateFields.costPrice = Number(updateData.costPrice);
      if (updateData.quantity !== undefined) updateFields.quantity = Number(updateData.quantity);
      if (updateData.weight !== undefined) updateFields.weight = Number(updateData.weight);
      if (updateData.lowStockThreshold !== undefined) updateFields.lowStockThreshold = Number(updateData.lowStockThreshold);

      // Update product
      const product = await this.db.product.update({
        where: { id },
        data: updateFields,
        include: {
          category: {
            select: { id: true, name: true, slug: true }
          },
          images: true
        }
      });

      return product;
    }, 'Failed to update product');
  }

  /**
   * Delete product (soft delete)
   */
  async deleteProduct(id: string) {
    this.validateId(id, 'Product');

    return this.handleDatabaseOperation(async () => {
      // Ensure product exists
      await this.ensureExists(
        () => this.db.product.findUnique({ where: { id } }),
        'Product'
      );

      // Soft delete by setting isActive to false
      await this.db.product.update({
        where: { id },
        data: { isActive: false }
      });
    }, 'Failed to delete product');
  }

  /**
   * Search products
   */
  async searchProducts(query: string, filters: ProductFilters = {}, pagination: PaginationOptions = {}) {
    if (!query || query.trim().length < 2) {
      throw this.createValidationError('Search query must be at least 2 characters long');
    }

    const searchFilters = {
      ...filters,
      search: query.trim()
    };

    return this.getProducts(searchFilters, pagination);
  }

  /**
   * Upload product images
   */
  async uploadProductImages(productId: string, imageBuffers: Buffer[]) {
    this.validateId(productId, 'Product');

    if (!imageBuffers || imageBuffers.length === 0) {
      throw this.createValidationError('At least one image is required');
    }

    return this.handleDatabaseOperation(async () => {
      // Check if product exists
      const product = await this.ensureExists(
        () => this.db.product.findUnique({ where: { id: productId } }),
        'Product'
      );

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
        return this.db.productImage.create({
          data: {
            productId,
            url: uploadResult.secure_url,
            altText: `${product.name} - bilde ${index + 1}`,
            sortOrder: index,
            imageType: index === 0 ? 'FRONT' : 'GENERAL',
            isPrimary: index === 0
          }
        });
      });

      const savedImages = await Promise.all(uploadPromises);
      return savedImages;
    }, 'Failed to upload product images');
  }

  /**
   * Delete product image
   */
  async deleteProductImage(productId: string, imageId: string) {
    this.validateId(productId, 'Product');
    this.validateId(imageId, 'Image');

    return this.handleDatabaseOperation(async () => {
      // Find the image in database
      const image = await this.ensureExists(
        () => this.db.productImage.findFirst({
          where: { id: imageId, productId }
        }),
        'Image'
      );

      // Extract public_id from Cloudinary URL
      const urlParts = image.url.split('/');
      const publicIdWithExtension = urlParts.slice(-2).join('/');
      const publicId = publicIdWithExtension.split('.')[0];

      // Delete from Cloudinary
      if (publicId) {
        await deleteFromCloudinary(publicId);
      }

      // Delete from database
      await this.db.productImage.delete({
        where: { id: imageId }
      });

      return { success: true };
    }, 'Failed to delete product image');
  }

  /**
   * Generate unique slug
   */
  private async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // Check if slug exists and make it unique
    let finalSlug = slug;
    let counter = 1;
    
    while (true) {
      const whereClause: any = { slug: finalSlug };
      if (excludeId) {
        const existing = await this.db.product.findFirst({
          where: { 
            slug: finalSlug,
            NOT: { id: excludeId }
          }
        });
        if (!existing) break;
      } else {
        const existing = await this.db.product.findUnique({ where: { slug: finalSlug } });
        if (!existing) break;
      }
      
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    return finalSlug;
  }

  /**
   * Calculate average rating
   */
  private async calculateAverageRating(productId: string): Promise<number> {
    const avgRating = await this.db.review.aggregate({
      where: { productId },
      _avg: { rating: true }
    });

    return avgRating._avg.rating ? Number(avgRating._avg.rating.toFixed(1)) : 0;
  }

  /**
   * Add ratings to products
   */
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