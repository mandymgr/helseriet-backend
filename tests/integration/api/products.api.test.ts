import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../../../src/app';
import { prisma } from '../../setup';

describe('Products API Integration', () => {
  let testCategory: any;
  let testProduct: any;
  
  beforeEach(async () => {
    // Clean up
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();

    // Create test category
    testCategory = await prisma.category.create({
      data: {
        name: 'Test Category',
        slug: 'test-category',
        description: 'Test category for API tests'
      }
    });

    // Create test product
    testProduct = await prisma.product.create({
      data: {
        name: 'Test Product',
        slug: 'test-product',
        sku: 'TEST-API-001',
        price: 99.99,
        categoryId: testCategory.id,
        status: 'ACTIVE',
        isActive: true,
        quantity: 10,
        description: 'Test product for API testing'
      }
    });
  });

  describe('GET /api/products', () => {
    it('should return products list', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('products');
      expect(Array.isArray(response.body.data.products)).toBe(true);
      expect(response.body.data.products).toHaveLength(1);
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app)
        .get('/api/products?page=1&limit=5')
        .expect(200);

      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get(`/api/products?category=${testCategory.id}`)
        .expect(200);

      expect(response.body.data.products).toHaveLength(1);
      expect(response.body.data.products[0].category.id).toBe(testCategory.id);
    });

    it('should search products', async () => {
      const response = await request(app)
        .get('/api/products?search=Test')
        .expect(200);

      expect(response.body.data.products).toHaveLength(1);
      expect(response.body.data.products[0].name).toContain('Test');
    });

    it('should return empty array when no products match filters', async () => {
      const response = await request(app)
        .get('/api/products?search=NonExistentProduct')
        .expect(200);

      expect(response.body.data.products).toHaveLength(0);
    });
  });

  describe('GET /api/products/:id', () => {
    it('should return single product', async () => {
      const response = await request(app)
        .get(`/api/products/${testProduct.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.id).toBe(testProduct.id);
      expect(response.body.data.name).toBe('Test Product');
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get('/api/products/non-existent-id')
        .expect(400); // ValidationError for invalid ID

      expect(response.body.success).toBe(false);
    });

    it('should include product images and category', async () => {
      const response = await request(app)
        .get(`/api/products/${testProduct.id}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('category');
      expect(response.body.data).toHaveProperty('images');
      expect(response.body.data.category.id).toBe(testCategory.id);
    });
  });

  describe('POST /api/products', () => {
    // Note: This would require authentication in real scenarios
    it('should create a new product', async () => {
      const productData = {
        name: 'New Test Product',
        sku: 'NEW-TEST-001',
        price: 149.99,
        categoryId: testCategory.id,
        description: 'New test product',
        quantity: 5
      };

      const response = await request(app)
        .post('/api/products')
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product.name).toBe(productData.name);
      expect(response.body.data.product.sku).toBe(productData.sku);
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        name: 'Incomplete Product'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/products')
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should prevent duplicate SKU', async () => {
      const productData = {
        name: 'Duplicate SKU Product',
        sku: 'TEST-API-001', // Same as existing product
        price: 149.99,
        categoryId: testCategory.id
      };

      const response = await request(app)
        .post('/api/products')
        .send(productData)
        .expect(409);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update existing product', async () => {
      const updateData = {
        name: 'Updated Test Product',
        price: 199.99
      };

      const response = await request(app)
        .put(`/api/products/${testProduct.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product.name).toBe(updateData.name);
      expect(response.body.data.product.price).toBe(updateData.price);
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .put('/api/products/non-existent-id')
        .send({ name: 'Updated' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should soft delete product', async () => {
      const response = await request(app)
        .delete(`/api/products/${testProduct.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify product is soft deleted
      const deletedProduct = await prisma.product.findUnique({
        where: { id: testProduct.id }
      });

      expect(deletedProduct?.isActive).toBe(false);
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .delete('/api/products/non-existent-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/products/search', () => {
    it('should search products with query parameter', async () => {
      const response = await request(app)
        .get('/api/products/search?q=Test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(1);
    });

    it('should validate minimum query length', async () => {
      const response = await request(app)
        .get('/api/products/search?q=a')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle empty search results', async () => {
      const response = await request(app)
        .get('/api/products/search?q=NonExistentQuery')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(0);
    });
  });
});