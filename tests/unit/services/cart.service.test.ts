import { describe, it, expect, beforeEach } from '@jest/globals';
import { cartService } from '@/services/cart.service';
import { prisma } from '../../setup';

describe('CartService', () => {
  let testUser: any;
  let testCategory: any;
  let testProduct: any;
  let testBundleProduct: any;
  let testBundleItemProduct: any;

  beforeEach(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        isActive: true
      }
    });

    // Create test category
    testCategory = await prisma.category.create({
      data: {
        name: 'Test Category',
        slug: 'test-category',
        description: 'Test category'
      }
    });

    // Create regular product
    testProduct = await prisma.product.create({
      data: {
        name: 'Test Product',
        slug: 'test-product',
        sku: 'TEST-001',
        price: 99.99,
        categoryId: testCategory.id,
        status: 'ACTIVE',
        isActive: true,
        quantity: 10,
        trackQuantity: true
      }
    });

    // Create bundle item product
    testBundleItemProduct = await prisma.product.create({
      data: {
        name: 'Bundle Item Product',
        slug: 'bundle-item-product',
        sku: 'BUNDLE-ITEM-001',
        price: 49.99,
        categoryId: testCategory.id,
        status: 'ACTIVE',
        isActive: true,
        quantity: 20,
        trackQuantity: true
      }
    });

    // Create bundle product
    testBundleProduct = await prisma.product.create({
      data: {
        name: 'Test Bundle',
        slug: 'test-bundle',
        sku: 'BUNDLE-001',
        price: 199.99,
        categoryId: testCategory.id,
        status: 'ACTIVE',
        isActive: true,
        isBundle: true,
        quantity: 0 // Bundles don't track their own quantity
      }
    });

    // Create bundle relationship
    await prisma.bundleItem.create({
      data: {
        bundleId: testBundleProduct.id,
        productId: testBundleItemProduct.id,
        quantity: 2 // Bundle contains 2 units of the item product
      }
    });
  });

  describe('getOrCreateCart', () => {
    it('should create cart if it does not exist', async () => {
      const cart = await cartService.getOrCreateCart(testUser.id);

      expect(cart).toBeDefined();
      expect(cart.userId).toBe(testUser.id);
      expect(cart.items).toHaveLength(0);
    });

    it('should return existing cart', async () => {
      // Create cart first
      const createdCart = await prisma.cart.create({
        data: { userId: testUser.id }
      });

      const cart = await cartService.getOrCreateCart(testUser.id);

      expect(cart.id).toBe(createdCart.id);
      expect(cart.userId).toBe(testUser.id);
    });

    it('should throw error for invalid user ID', async () => {
      await expect(
        cartService.getOrCreateCart('invalid-id')
      ).rejects.toThrow('Invalid user ID format');
    });
  });

  describe('addToCart', () => {
    it('should add product to cart successfully', async () => {
      const cartItem = await cartService.addToCart(testUser.id, {
        productId: testProduct.id,
        quantity: 2
      });

      expect(cartItem.productId).toBe(testProduct.id);
      expect(cartItem.quantity).toBe(2);
    });

    it('should update quantity for existing cart item', async () => {
      // Add product first time
      await cartService.addToCart(testUser.id, {
        productId: testProduct.id,
        quantity: 2
      });

      // Add same product again
      const cartItem = await cartService.addToCart(testUser.id, {
        productId: testProduct.id,
        quantity: 3
      });

      expect(cartItem.quantity).toBe(5); // 2 + 3
    });

    it('should throw error for insufficient stock', async () => {
      await expect(
        cartService.addToCart(testUser.id, {
          productId: testProduct.id,
          quantity: 15 // More than available (10)
        })
      ).rejects.toThrow('Insufficient stock');
    });

    it('should check bundle item stock correctly', async () => {
      // Try to add more bundles than bundle items allow
      await expect(
        cartService.addToCart(testUser.id, {
          productId: testBundleProduct.id,
          quantity: 15 // Would need 30 bundle items (15 * 2), but only 20 available
        })
      ).rejects.toThrow('Insufficient stock for Bundle Item Product in bundle');
    });

    it('should add bundle to cart when stock is sufficient', async () => {
      const cartItem = await cartService.addToCart(testUser.id, {
        productId: testBundleProduct.id,
        quantity: 5 // Needs 10 bundle items (5 * 2), which is available
      });

      expect(cartItem.productId).toBe(testBundleProduct.id);
      expect(cartItem.quantity).toBe(5);
    });

    it('should throw error for inactive product', async () => {
      await prisma.product.update({
        where: { id: testProduct.id },
        data: { isActive: false }
      });

      await expect(
        cartService.addToCart(testUser.id, {
          productId: testProduct.id,
          quantity: 1
        })
      ).rejects.toThrow('Product is not available');
    });

    it('should validate required fields', async () => {
      await expect(
        cartService.addToCart(testUser.id, {} as any)
      ).rejects.toThrow('Missing required fields');
    });

    it('should validate minimum quantity', async () => {
      await expect(
        cartService.addToCart(testUser.id, {
          productId: testProduct.id,
          quantity: 0
        })
      ).rejects.toThrow('Quantity must be at least 1');
    });
  });

  describe('updateCartItem', () => {
    let cart: any;
    let cartItem: any;

    beforeEach(async () => {
      cart = await prisma.cart.create({
        data: { userId: testUser.id }
      });

      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: testProduct.id,
          quantity: 3
        }
      });
    });

    it('should update cart item quantity', async () => {
      const updatedItem = await cartService.updateCartItem(
        testUser.id,
        cartItem.id,
        { quantity: 5 }
      );

      expect(updatedItem.quantity).toBe(5);
    });

    it('should throw error for insufficient stock on update', async () => {
      await expect(
        cartService.updateCartItem(testUser.id, cartItem.id, {
          quantity: 15 // More than available
        })
      ).rejects.toThrow('Insufficient stock');
    });

    it('should throw error for non-existent cart item', async () => {
      await expect(
        cartService.updateCartItem(testUser.id, 'non-existent-id', {
          quantity: 2
        })
      ).rejects.toThrow('Cart item not found');
    });

    it('should throw error for cart item belonging to different user', async () => {
      const anotherUser = await prisma.user.create({
        data: {
          email: 'another@example.com',
          password: 'hashedpassword',
          firstName: 'Another',
          lastName: 'User',
          isActive: true
        }
      });

      await expect(
        cartService.updateCartItem(anotherUser.id, cartItem.id, {
          quantity: 2
        })
      ).rejects.toThrow('Cart item not found');
    });

    it('should validate minimum quantity on update', async () => {
      await expect(
        cartService.updateCartItem(testUser.id, cartItem.id, {
          quantity: 0
        })
      ).rejects.toThrow('Quantity must be at least 1');
    });
  });

  describe('removeFromCart', () => {
    let cart: any;
    let cartItem: any;

    beforeEach(async () => {
      cart = await prisma.cart.create({
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

    it('should remove cart item successfully', async () => {
      await cartService.removeFromCart(testUser.id, cartItem.id);

      const removedItem = await prisma.cartItem.findUnique({
        where: { id: cartItem.id }
      });

      expect(removedItem).toBeNull();
    });

    it('should throw error for non-existent cart item', async () => {
      await expect(
        cartService.removeFromCart(testUser.id, 'non-existent-id')
      ).rejects.toThrow('Cart item not found');
    });

    it('should throw error for cart item belonging to different user', async () => {
      const anotherUser = await prisma.user.create({
        data: {
          email: 'another@example.com',
          password: 'hashedpassword',
          firstName: 'Another',
          lastName: 'User',
          isActive: true
        }
      });

      await expect(
        cartService.removeFromCart(anotherUser.id, cartItem.id)
      ).rejects.toThrow('Cart item not found');
    });
  });

  describe('clearCart', () => {
    let cart: any;

    beforeEach(async () => {
      cart = await prisma.cart.create({
        data: { userId: testUser.id }
      });

      // Add some items to cart
      await prisma.cartItem.createMany({
        data: [
          { cartId: cart.id, productId: testProduct.id, quantity: 2 },
          { cartId: cart.id, productId: testBundleProduct.id, quantity: 1 }
        ]
      });
    });

    it('should clear all items from cart', async () => {
      await cartService.clearCart(testUser.id);

      const remainingItems = await prisma.cartItem.findMany({
        where: { cartId: cart.id }
      });

      expect(remainingItems).toHaveLength(0);
    });

    it('should handle clearing non-existent cart gracefully', async () => {
      const newUser = await prisma.user.create({
        data: {
          email: 'newuser@example.com',
          password: 'hashedpassword',
          firstName: 'New',
          lastName: 'User',
          isActive: true
        }
      });

      await expect(
        cartService.clearCart(newUser.id)
      ).resolves.not.toThrow();
    });
  });

  describe('getCartTotal', () => {
    let cart: any;

    beforeEach(async () => {
      cart = await prisma.cart.create({
        data: { userId: testUser.id }
      });
    });

    it('should calculate cart total correctly', async () => {
      await prisma.cartItem.createMany({
        data: [
          { cartId: cart.id, productId: testProduct.id, quantity: 2 }, // 2 * 99.99 = 199.98
          { cartId: cart.id, productId: testBundleItemProduct.id, quantity: 1 } // 1 * 49.99 = 49.99
        ]
      });

      const total = await cartService.getCartTotal(testUser.id);

      expect(total).toBe(249.97); // 199.98 + 49.99
    });

    it('should return 0 for empty cart', async () => {
      const total = await cartService.getCartTotal(testUser.id);

      expect(total).toBe(0);
    });

    it('should return 0 for non-existent cart', async () => {
      const newUser = await prisma.user.create({
        data: {
          email: 'newuser@example.com',
          password: 'hashedpassword',
          firstName: 'New',
          lastName: 'User',
          isActive: true
        }
      });

      const total = await cartService.getCartTotal(newUser.id);

      expect(total).toBe(0);
    });
  });

  describe('stock validation edge cases', () => {
    it('should handle bundle with multiple different products', async () => {
      // Create another product for the bundle
      const secondBundleItem = await prisma.product.create({
        data: {
          name: 'Second Bundle Item',
          slug: 'second-bundle-item',
          sku: 'BUNDLE-ITEM-002',
          price: 29.99,
          categoryId: testCategory.id,
          status: 'ACTIVE',
          isActive: true,
          quantity: 5, // Limited stock
          trackQuantity: true
        }
      });

      // Add second item to bundle
      await prisma.bundleItem.create({
        data: {
          bundleId: testBundleProduct.id,
          productId: secondBundleItem.id,
          quantity: 1 // Bundle contains 1 unit of this product
        }
      });

      // Try to add more bundles than the limiting product allows
      await expect(
        cartService.addToCart(testUser.id, {
          productId: testBundleProduct.id,
          quantity: 6 // Would need 6 of secondBundleItem, but only 5 available
        })
      ).rejects.toThrow('Insufficient stock for Second Bundle Item in bundle');
    });

    it('should handle concurrent cart updates correctly', async () => {
      // Add initial quantity
      await cartService.addToCart(testUser.id, {
        productId: testProduct.id,
        quantity: 5
      });

      // Try to add more than remaining stock
      await expect(
        cartService.addToCart(testUser.id, {
          productId: testProduct.id,
          quantity: 8 // 5 + 8 = 13, but only 10 available
        })
      ).rejects.toThrow('Insufficient stock');
    });
  });
});