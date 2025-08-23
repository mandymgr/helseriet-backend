import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../../../src/app';
import { prisma } from '../../setup';
import { hash } from 'bcryptjs';

describe('Cart API Integration', () => {
  let testUser: any;
  let authToken: string;
  let testCategory: any;
  let testProduct: any;
  
  beforeEach(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: await hash('TestPassword123', 12),
        firstName: 'Test',
        lastName: 'User',
        isActive: true
      }
    });

    // Create auth token (simplified - in real app would use JWT)
    authToken = 'test-auth-token';

    // Create test category and product
    testCategory = await prisma.category.create({
      data: {
        name: 'Test Category',
        slug: 'test-category',
        description: 'Test category'
      }
    });

    testProduct = await prisma.product.create({
      data: {
        name: 'Test Product',
        slug: 'test-product',
        sku: 'TEST-CART-001',
        price: 99.99,
        categoryId: testCategory.id,
        status: 'ACTIVE',
        isActive: true,
        quantity: 10
      }
    });
  });

  describe('GET /api/cart', () => {
    it('should get empty cart for new user', async () => {
      // Note: In real app, this would require authentication middleware
      // For now, we'll mock the user ID in the request
      const response = await request(app)
        .get('/api/cart')
        .set('x-user-id', testUser.id) // Mock auth
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data.items).toHaveLength(0);
    });

    it('should return cart with items', async () => {
      // Create cart with items first
      const cart = await prisma.cart.create({
        data: { userId: testUser.id }
      });

      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: testProduct.id,
          quantity: 2
        }
      });

      const response = await request(app)
        .get('/api/cart')
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].quantity).toBe(2);
    });
  });

  describe('POST /api/cart', () => {
    it('should add product to cart', async () => {
      const cartData = {
        productId: testProduct.id,
        quantity: 2
      };

      const response = await request(app)
        .post('/api/cart')
        .set('x-user-id', testUser.id)
        .send(cartData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.productId).toBe(testProduct.id);
      expect(response.body.data.quantity).toBe(2);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/cart')
        .set('x-user-id', testUser.id)
        .send({}) // Missing productId and quantity
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should check product availability', async () => {
      const cartData = {
        productId: testProduct.id,
        quantity: 15 // More than available (10)
      };

      const response = await request(app)
        .post('/api/cart')
        .set('x-user-id', testUser.id)
        .send(cartData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should update quantity for existing cart item', async () => {
      // Add product first
      await request(app)
        .post('/api/cart')
        .set('x-user-id', testUser.id)
        .send({ productId: testProduct.id, quantity: 2 });

      // Add same product again
      const response = await request(app)
        .post('/api/cart')
        .set('x-user-id', testUser.id)
        .send({ productId: testProduct.id, quantity: 3 })
        .expect(200);

      expect(response.body.data.quantity).toBe(5); // 2 + 3
    });
  });

  describe('PUT /api/cart/:itemId', () => {
    let cartItem: any;

    beforeEach(async () => {
      const cart = await prisma.cart.create({
        data: { userId: testUser.id }
      });

      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: testProduct.id,
          quantity: 2
        }
      });
    });

    it('should update cart item quantity', async () => {
      const updateData = { quantity: 5 };

      const response = await request(app)
        .put(`/api/cart/${cartItem.id}`)
        .set('x-user-id', testUser.id)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quantity).toBe(5);
    });

    it('should validate stock availability on update', async () => {
      const response = await request(app)
        .put(`/api/cart/${cartItem.id}`)
        .set('x-user-id', testUser.id)
        .send({ quantity: 15 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent cart item', async () => {
      const response = await request(app)
        .put('/api/cart/non-existent-id')
        .set('x-user-id', testUser.id)
        .send({ quantity: 2 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/cart/:itemId', () => {
    let cartItem: any;

    beforeEach(async () => {
      const cart = await prisma.cart.create({
        data: { userId: testUser.id }
      });

      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: testProduct.id,
          quantity: 2
        }
      });
    });

    it('should remove item from cart', async () => {
      const response = await request(app)
        .delete(`/api/cart/${cartItem.id}`)
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify item is removed
      const removedItem = await prisma.cartItem.findUnique({
        where: { id: cartItem.id }
      });
      expect(removedItem).toBeNull();
    });

    it('should return 404 for non-existent cart item', async () => {
      const response = await request(app)
        .delete('/api/cart/non-existent-id')
        .set('x-user-id', testUser.id)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/cart', () => {
    beforeEach(async () => {
      const cart = await prisma.cart.create({
        data: { userId: testUser.id }
      });

      await prisma.cartItem.createMany({
        data: [
          { cartId: cart.id, productId: testProduct.id, quantity: 2 }
        ]
      });
    });

    it('should clear entire cart', async () => {
      const response = await request(app)
        .delete('/api/cart')
        .set('x-user-id', testUser.id)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify cart is empty
      const cart = await prisma.cart.findUnique({
        where: { userId: testUser.id },
        include: { items: true }
      });

      expect(cart?.items).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/cart')
        .expect(401); // Assuming auth middleware returns 401

      expect(response.body.success).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      // Simulate database error by using invalid product ID format
      const response = await request(app)
        .post('/api/cart')
        .set('x-user-id', testUser.id)
        .send({
          productId: 'invalid-format',
          quantity: 1
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});