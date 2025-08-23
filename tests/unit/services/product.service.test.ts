import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { productService } from '@/services/product.service';
import { prisma } from '../../setup';

// Mock Cloudinary
jest.mock('@/config/cloudinary', () => ({
  uploadToCloudinary: jest.fn(),
  deleteFromCloudinary: jest.fn()
}));

describe('ProductService', () => {
  let testCategory: any;
  let testProduct: any;

  beforeEach(async () => {
    // Clean up and create test data
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();

    // Create test category
    testCategory = await prisma.category.create({
      data: {
        name: 'Test Category',
        slug: 'test-category',
        description: 'Test category description'
      }
    });
  });

  describe('createProduct', () => {
    it('should create a new product successfully', async () => {
      const productData = {
        name: 'Test Product',
        sku: 'TEST-001',
        price: 99.99,
        categoryId: testCategory.id,
        description: 'Test product description',
        quantity: 10
      };

      const product = await productService.createProduct(productData);

      expect(product).toBeDefined();
      expect(product.name).toBe(productData.name);
      expect(product.sku).toBe(productData.sku);
      expect(product.price).toBe(productData.price);
      expect(product.slug).toBe('test-product');
      expect(product.status).toBe('DRAFT');
    });

    it('should throw error for duplicate SKU', async () => {
      const productData = {
        name: 'Test Product',
        sku: 'TEST-DUPLICATE',
        price: 99.99,
        categoryId: testCategory.id
      };

      await productService.createProduct(productData);

      await expect(
        productService.createProduct(productData)
      ).rejects.toThrow('A product with this SKU already exists');
    });

    it('should throw error for missing required fields', async () => {
      const incompleteData = {
        name: 'Test Product'
        // Missing SKU, price, categoryId
      };

      await expect(
        productService.createProduct(incompleteData as any)
      ).rejects.toThrow('Missing required fields');
    });

    it('should throw error for non-existent category', async () => {
      const productData = {
        name: 'Test Product',
        sku: 'TEST-001',
        price: 99.99,
        categoryId: 'non-existent-id'
      };

      await expect(
        productService.createProduct(productData)
      ).rejects.toThrow('Category not found');
    });

    it('should generate unique slug for duplicate names', async () => {
      const baseData = {
        name: 'Duplicate Name Product',
        price: 99.99,
        categoryId: testCategory.id
      };

      const product1 = await productService.createProduct({
        ...baseData,
        sku: 'DUPLICATE-1'
      });

      const product2 = await productService.createProduct({
        ...baseData,
        sku: 'DUPLICATE-2'
      });

      expect(product1.slug).toBe('duplicate-name-product');
      expect(product2.slug).toBe('duplicate-name-product-1');
    });
  });

  describe('getProducts', () => {
    beforeEach(async () => {
      // Create multiple test products
      testProduct = await prisma.product.create({
        data: {
          name: 'Test Product 1',
          slug: 'test-product-1',
          sku: 'TEST-001',
          price: 99.99,
          categoryId: testCategory.id,
          status: 'ACTIVE',
          isActive: true,
          quantity: 10
        }
      });

      await prisma.product.create({
        data: {
          name: 'Test Product 2',
          slug: 'test-product-2',
          sku: 'TEST-002',
          price: 149.99,
          categoryId: testCategory.id,
          status: 'ACTIVE',
          isActive: true,
          quantity: 5
        }
      });

      await prisma.product.create({
        data: {
          name: 'Bundle Product',
          slug: 'bundle-product',
          sku: 'BUNDLE-001',
          price: 199.99,
          categoryId: testCategory.id,
          status: 'ACTIVE',
          isActive: true,
          isBundle: true,
          quantity: 0
        }
      });
    });

    it('should return paginated products', async () => {
      const result = await productService.getProducts({}, { page: 1, limit: 2 });

      expect(result.products).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.pages).toBe(2);
    });

    it('should filter by category', async () => {
      const result = await productService.getProducts({
        category: testCategory.id
      });

      expect(result.products).toHaveLength(3);
      result.products.forEach(product => {
        expect(product.category?.id).toBe(testCategory.id);
      });
    });

    it('should filter by bundle status', async () => {
      const result = await productService.getProducts({
        isBundle: true
      });

      expect(result.products).toHaveLength(1);
      expect(result.products[0].isBundle).toBe(true);
    });

    it('should search products by name', async () => {
      const result = await productService.getProducts({
        search: 'Bundle'
      });

      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toContain('Bundle');
    });

    it('should include product ratings', async () => {
      // Create a review for the test product
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: 'hashedpassword',
          firstName: 'Test',
          lastName: 'User',
          isActive: true
        }
      });

      await prisma.review.create({
        data: {
          productId: testProduct.id,
          userId: user.id,
          rating: 4.5,
          title: 'Great product',
          comment: 'Really good product!'
        }
      });

      const result = await productService.getProducts();
      const productWithRating = result.products.find(p => p.id === testProduct.id);

      expect(productWithRating?.avgRating).toBe(4.5);
      expect(productWithRating?.reviewCount).toBe(1);
    });
  });

  describe('getProductById', () => {
    beforeEach(async () => {
      testProduct = await prisma.product.create({
        data: {
          name: 'Test Product',
          slug: 'test-product',
          sku: 'TEST-001',
          price: 99.99,
          categoryId: testCategory.id,
          status: 'ACTIVE',
          isActive: true,
          description: 'Test product description'
        }
      });
    });

    it('should return product by ID', async () => {
      const product = await productService.getProductById(testProduct.id);

      expect(product).toBeDefined();
      expect(product.id).toBe(testProduct.id);
      expect(product.name).toBe('Test Product');
      expect(product.averageRating).toBe(0);
    });

    it('should throw error for non-existent product', async () => {
      await expect(
        productService.getProductById('non-existent-id')
      ).rejects.toThrow('Product not found');
    });

    it('should throw error for invalid ID format', async () => {
      await expect(
        productService.getProductById('invalid-id')
      ).rejects.toThrow('Invalid product ID format');
    });

    it('should not return inactive products', async () => {
      await prisma.product.update({
        where: { id: testProduct.id },
        data: { isActive: false }
      });

      await expect(
        productService.getProductById(testProduct.id)
      ).rejects.toThrow('Product not found');
    });
  });

  describe('updateProduct', () => {
    beforeEach(async () => {
      testProduct = await prisma.product.create({
        data: {
          name: 'Test Product',
          slug: 'test-product',
          sku: 'TEST-001',
          price: 99.99,
          categoryId: testCategory.id,
          status: 'ACTIVE',
          isActive: true
        }
      });
    });

    it('should update product successfully', async () => {
      const updateData = {
        name: 'Updated Product',
        price: 149.99,
        description: 'Updated description'
      };

      const updatedProduct = await productService.updateProduct(testProduct.id, updateData);

      expect(updatedProduct.name).toBe('Updated Product');
      expect(updatedProduct.price).toBe(149.99);
      expect(updatedProduct.description).toBe('Updated description');
      expect(updatedProduct.slug).toBe('updated-product');
    });

    it('should prevent duplicate SKU on update', async () => {
      const secondProduct = await prisma.product.create({
        data: {
          name: 'Second Product',
          slug: 'second-product',
          sku: 'TEST-002',
          price: 79.99,
          categoryId: testCategory.id,
          status: 'ACTIVE',
          isActive: true
        }
      });

      await expect(
        productService.updateProduct(testProduct.id, { sku: 'TEST-002' })
      ).rejects.toThrow('A product with this SKU already exists');
    });

    it('should validate category exists on update', async () => {
      await expect(
        productService.updateProduct(testProduct.id, { categoryId: 'non-existent' })
      ).rejects.toThrow('Category not found');
    });
  });

  describe('deleteProduct', () => {
    beforeEach(async () => {
      testProduct = await prisma.product.create({
        data: {
          name: 'Test Product',
          slug: 'test-product',
          sku: 'TEST-001',
          price: 99.99,
          categoryId: testCategory.id,
          status: 'ACTIVE',
          isActive: true
        }
      });
    });

    it('should soft delete product', async () => {
      await productService.deleteProduct(testProduct.id);

      const deletedProduct = await prisma.product.findUnique({
        where: { id: testProduct.id }
      });

      expect(deletedProduct?.isActive).toBe(false);
    });

    it('should throw error for non-existent product', async () => {
      await expect(
        productService.deleteProduct('non-existent-id')
      ).rejects.toThrow('Product not found');
    });
  });

  describe('searchProducts', () => {
    beforeEach(async () => {
      await prisma.product.createMany({
        data: [
          {
            name: 'Apple iPhone 15',
            slug: 'apple-iphone-15',
            sku: 'IPHONE-15',
            price: 999.99,
            categoryId: testCategory.id,
            status: 'ACTIVE',
            isActive: true,
            description: 'Latest iPhone model'
          },
          {
            name: 'Samsung Galaxy S24',
            slug: 'samsung-galaxy-s24',
            sku: 'GALAXY-S24',
            price: 899.99,
            categoryId: testCategory.id,
            status: 'ACTIVE',
            isActive: true,
            description: 'Latest Samsung phone'
          }
        ]
      });
    });

    it('should search products by query', async () => {
      const result = await productService.searchProducts('iPhone');

      expect(result.products).toHaveLength(1);
      expect(result.products[0].name).toContain('iPhone');
    });

    it('should throw error for short query', async () => {
      await expect(
        productService.searchProducts('a')
      ).rejects.toThrow('Search query must be at least 2 characters long');
    });

    it('should return empty results for no matches', async () => {
      const result = await productService.searchProducts('nonexistent');

      expect(result.products).toHaveLength(0);
    });
  });
});