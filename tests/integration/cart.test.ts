import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '@/app';
import { prisma } from '../setup';
import { hashSync } from 'bcryptjs';

describe('Cart API Integration', () => {
  let authToken: string;
  let userId: string;
  let testProduct: any;
  let testBundle: any;
  let categoryId: string;

  beforeEach(async () => {
    // Clean up data
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.bundleItem.deleteMany();
    await prisma.productImage.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();

    // Create test category
    const category = await prisma.category.create({
      data: {
        name: 'Test Category',
        slug: 'test-category',
        description: 'Test category description'
      }
    });
    categoryId = category.id;

    // Create test products
    testProduct = await prisma.product.create({
      data: {
        name: 'Test Product',
        slug: 'test-product',
        description: 'Test product description',
        sku: 'TEST-001',
        price: 99.99,
        comparePrice: 129.99,
        quantity: 100,
        categoryId,
        status: 'ACTIVE',
        isActive: true,
        isBundle: false
      }
    });

    // Create test bundle with bundled items
    testBundle = await prisma.product.create({
      data: {
        name: 'Test Bundle',
        slug: 'test-bundle',
        description: 'Test bundle description',
        sku: 'BUNDLE-001',
        price: 149.99,
        quantity: 50,
        categoryId,
        status: 'ACTIVE',
        isActive: true,
        isBundle: true
      }
    });

    // Create bundle items
    await prisma.bundleItem.create({
      data: {
        bundleId: testBundle.id,
        productId: testProduct.id,
        quantity: 2
      }
    });

    // Create test user and get auth token
    const userData = {
      email: 'test@example.com',
      password: 'testpassword123',
      firstName: 'Test',
      lastName: 'User'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    authToken = registerResponse.body.data.accessToken;
    userId = registerResponse.body.data.user.id;
  });

  describe('GET /api/cart', () => {
    it('should create empty cart for new user', async () => {
      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(0);
      expect(response.body.data.userId).toBe(userId);
    });

    it('should return existing cart with items', async () => {
      // Add item to cart first
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productId: testProduct.id, quantity: 2 });

      const response = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].quantity).toBe(2);
      expect(response.body.data.items[0].product.name).toBe('Test Product');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/cart')
        .expect(401);
    });
  });

  describe('POST /api/cart', () => {
    it('should add product to cart successfully', async () => {
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productId: testProduct.id, quantity: 3 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Produkt lagt til i handlekurv');
      expect(response.body.data.quantity).toBe(3);
      expect(response.body.data.product.name).toBe('Test Product');
    });

    it('should add bundle to cart with stock validation', async () => {
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productId: testBundle.id, quantity: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Produkt lagt till i handlekurv');
      expect(response.body.data.product.name).toBe('Test Bundle');
    });

    it('should update quantity if product already in cart', async () => {
      // Add product first time
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productId: testProduct.id, quantity: 2 });

      // Add same product again
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productId: testProduct.id, quantity: 3 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quantity).toBe(5); // 2 + 3
    });

    it('should reject adding more than available stock', async () => {
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productId: testProduct.id, quantity: 150 }) // More than 100 in stock
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Ikke nok på lager');
    });

    it('should reject adding bundle when bundled items insufficient stock', async () => {
      // Update test product to have low stock
      await prisma.product.update({
        where: { id: testProduct.id },
        data: { quantity: 1 }
      });

      // Try to add bundle which requires 2 of the test product
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productId: testBundle.id, quantity: 1 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Ikke nok på lager for');
    });

    it('should reject adding non-existent product', async () => {
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productId: 'non-existent-id', quantity: 1 })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Produkt ikke funnet eller ikke tilgjengelig');
    });

    it('should reject request without product ID', async () => {
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quantity: 1 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Produkt-ID er påkrevd');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/cart')
        .send({ productId: testProduct.id, quantity: 1 })
        .expect(401);
    });
  });

  describe('PUT /api/cart/:itemId', () => {
    let cartItemId: string;

    beforeEach(async () => {
      // Add item to cart first
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productId: testProduct.id, quantity: 2 });

      cartItemId = response.body.data.id;
    });

    it('should update cart item quantity', async () => {
      const response = await request(app)
        .put(`/api/cart/${cartItemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quantity: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Handlekurv oppdatert');
      expect(response.body.data.quantity).toBe(5);
    });

    it('should reject quantity less than 1', async () => {
      const response = await request(app)
        .put(`/api/cart/${cartItemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quantity: 0 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Antall må være minst 1');
    });

    it('should reject quantity exceeding stock', async () => {
      const response = await request(app)
        .put(`/api/cart/${cartItemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quantity: 150 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Ikke nok på lager');
    });

    it('should reject updating non-existent cart item', async () => {
      const response = await request(app)
        .put('/api/cart/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quantity: 1 })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Handlekurv-element ikke funnet');
    });
  });

  describe('DELETE /api/cart/:itemId', () => {
    let cartItemId: string;

    beforeEach(async () => {
      // Add item to cart first
      const response = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productId: testProduct.id, quantity: 2 });

      cartItemId = response.body.data.id;
    });

    it('should remove item from cart', async () => {
      const response = await request(app)
        .delete(`/api/cart/${cartItemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Produkt fjernet fra handlekurv');

      // Verify item is removed
      const cartResponse = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${authToken}`);

      expect(cartResponse.body.data.items).toHaveLength(0);
    });

    it('should reject removing non-existent cart item', async () => {
      const response = await request(app)
        .delete('/api/cart/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Handlekurv-element ikke funnet');
    });
  });

  describe('DELETE /api/cart', () => {
    beforeEach(async () => {
      // Add multiple items to cart
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productId: testProduct.id, quantity: 2 });
    });

    it('should clear entire cart', async () => {
      const response = await request(app)
        .delete('/api/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Handlekurv tømt');

      // Verify cart is empty
      const cartResponse = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${authToken}`);

      expect(cartResponse.body.data.items).toHaveLength(0);
    });
  });
});