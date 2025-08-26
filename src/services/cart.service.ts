import { BaseService } from './base.service';
import type { Cart, CartItem, Product } from '@prisma/client';

interface AddToCartData {
  productId: string;
  quantity: number;
}

interface UpdateCartItemData {
  quantity: number;
}

interface CartWithItems extends Cart {
  items: (CartItem & {
    product: Product & {
      category?: any;
      images?: any[];
      bundleItems?: any[];
    };
  })[];
}

export class CartService extends BaseService {
  /**
   * Get or create user's cart
   */
  async getOrCreateCart(userId: string): Promise<CartWithItems> {
    this.validateId(userId, 'User');

    return this.handleDatabaseOperation(async () => {
      let cart = await this.db.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true,
                  images: {
                    orderBy: { sortOrder: 'asc' },
                    take: 1
                  },
                  bundleItems: {
                    include: {
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
              }
            }
          }
        }
      });

      if (!cart) {
        cart = await this.db.cart.create({
          data: { userId },
          include: {
            items: {
              include: {
                product: {
                  include: {
                    category: true,
                    images: {
                      orderBy: { sortOrder: 'asc' },
                      take: 1
                    },
                    bundleItems: {
                      include: {
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
                }
              }
            }
          }
        });
      }

      return cart;
    }, 'Failed to get or create cart');
  }

  /**
   * Add product to cart
   */
  async addToCart(userId: string, data: AddToCartData): Promise<CartItem> {
    this.validateId(userId, 'User');
    this.validateRequiredFields(data, ['productId', 'quantity']);
    this.validateId(data.productId, 'Product');

    if (data.quantity < 1) {
      throw this.createValidationError('Quantity must be at least 1');
    }

    return this.handleDatabaseOperation(async () => {
      // Verify product exists and is available
      const product = await this.ensureExists(
        () => this.db.product.findUnique({
          where: { id: data.productId },
          include: {
            bundleItems: {
              include: { product: true }
            }
          }
        }),
        'Product'
      );

      if (!product.isActive) {
        throw this.createValidationError('Product is not available');
      }

      // Check stock availability
      await this.checkStockAvailability(product, data.quantity);

      // Get or create cart
      const cart = await this.getOrCreateCart(userId);

      // Check if item already exists in cart
      const existingItem = await this.db.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId: data.productId
          }
        }
      });

      let cartItem: CartItem;

      if (existingItem) {
        // Update existing item
        const newQuantity = existingItem.quantity + data.quantity;
        await this.checkStockAvailability(product, newQuantity);

        cartItem = await this.db.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: newQuantity },
          include: {
            product: {
              include: {
                category: true,
                images: {
                  orderBy: { sortOrder: 'asc' },
                  take: 1
                }
              }
            }
          }
        });
      } else {
        // Create new cart item
        cartItem = await this.db.cartItem.create({
          data: {
            cartId: cart.id,
            productId: data.productId,
            quantity: data.quantity
          },
          include: {
            product: {
              include: {
                category: true,
                images: {
                  orderBy: { sortOrder: 'asc' },
                  take: 1
                }
              }
            }
          }
        });
      }

      return cartItem;
    }, 'Failed to add item to cart');
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(userId: string, itemId: string, data: UpdateCartItemData): Promise<CartItem> {
    this.validateId(userId, 'User');
    this.validateId(itemId, 'Cart item');
    this.validateRequiredFields(data, ['quantity']);

    if (data.quantity < 1) {
      throw this.createValidationError('Quantity must be at least 1');
    }

    return this.handleDatabaseOperation(async () => {
      // Find cart item and verify ownership
      const cartItem = await this.ensureExists(
        () => this.db.cartItem.findFirst({
          where: {
            id: itemId,
            cart: { userId }
          },
          include: {
            product: {
              include: {
                bundleItems: {
                  include: { product: true }
                }
              }
            }
          }
        }),
        'Cart item'
      );

      // Check stock availability
      await this.checkStockAvailability(cartItem.product, data.quantity);

      // Update cart item
      const updatedItem = await this.db.cartItem.update({
        where: { id: itemId },
        data: { quantity: data.quantity },
        include: {
          product: {
            include: {
              category: true,
              images: {
                orderBy: { sortOrder: 'asc' },
                take: 1
              }
            }
          }
        }
      });

      return updatedItem;
    }, 'Failed to update cart item');
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(userId: string, itemId: string): Promise<void> {
    this.validateId(userId, 'User');
    this.validateId(itemId, 'Cart item');

    return this.handleDatabaseOperation(async () => {
      // Verify cart item exists and belongs to user
      await this.ensureExists(
        () => this.db.cartItem.findFirst({
          where: {
            id: itemId,
            cart: { userId }
          }
        }),
        'Cart item'
      );

      await this.db.cartItem.delete({
        where: { id: itemId }
      });
    }, 'Failed to remove item from cart');
  }

  /**
   * Clear user's cart
   */
  async clearCart(userId: string): Promise<void> {
    this.validateId(userId, 'User');

    return this.handleDatabaseOperation(async () => {
      const cart = await this.db.cart.findUnique({
        where: { userId }
      });

      if (cart) {
        await this.db.cartItem.deleteMany({
          where: { cartId: cart.id }
        });
      }
    }, 'Failed to clear cart');
  }

  /**
   * Get cart total
   */
  async getCartTotal(userId: string): Promise<number> {
    this.validateId(userId, 'User');

    return this.handleDatabaseOperation(async () => {
      const cart = await this.db.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });

      if (!cart) {
        return 0;
      }

      return cart.items.reduce((total, item) => {
        return total + (Number(item.product.price) * item.quantity);
      }, 0);
    }, 'Failed to calculate cart total');
  }

  /**
   * Check stock availability for product or bundle
   */
  private async checkStockAvailability(product: any, requestedQuantity: number): Promise<void> {
    if (product.isBundle && product.bundleItems.length > 0) {
      // Check stock for each bundle item
      for (const bundleItem of product.bundleItems) {
        const requiredQuantity = bundleItem.quantity * requestedQuantity;
        if (bundleItem.product.quantity < requiredQuantity) {
          throw this.createValidationError(
            `Insufficient stock for ${bundleItem.product.name} in bundle`
          );
        }
      }
    } else {
      // Check stock for regular product
      if (product.quantity < requestedQuantity) {
        throw this.createValidationError('Insufficient stock');
      }
    }
  }

  /**
   * Get product by ID for session cart
   */
  async getProductById(productId: string) {
    this.validateId(productId, 'Product');

    return this.handleDatabaseOperation(async () => {
      return this.db.product.findUnique({
        where: { id: productId },
        include: {
          category: true,
          images: {
            orderBy: { sortOrder: 'asc' }
          }
        }
      });
    }, 'Failed to get product');
  }
}

export const cartService = new CartService();