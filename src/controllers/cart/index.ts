// @ts-nocheck - Temporary disable strict checking for session cart implementation
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { cartService } from '@/services/cart.service';

class CartController {
  async getCart(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const cart = await cartService.getOrCreateCart(userId);

      return res.status(200).json({
        success: true,
        data: cart
      });
    } catch (error) {
      next(error);
    }
  }

  async addToCart(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { productId, quantity = 1 } = req.body;
      const cartItem = await cartService.addToCart(userId, { productId, quantity });

      return res.status(200).json({
        success: true,
        message: 'Product added to cart',
        data: cartItem
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCartItem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { itemId } = req.params;
      const { quantity } = req.body;

      if (!itemId) {
        throw new Error('Item ID is required');
      }

      const updatedItem = await cartService.updateCartItem(userId, itemId, { quantity });

      return res.status(200).json({
        success: true,
        message: 'Cart updated',
        data: updatedItem
      });
    } catch (error) {
      next(error);
    }
  }

  async removeFromCart(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { itemId } = req.params;

      if (!itemId) {
        throw new Error('Item ID is required');
      }

      await cartService.removeFromCart(userId, itemId);

      return res.status(200).json({
        success: true,
        message: 'Product removed from cart'
      });
    } catch (error) {
      next(error);
    }
  }

  async clearCart(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      await cartService.clearCart(userId);

      return res.status(200).json({
        success: true,
        message: 'Cart cleared'
      });
    } catch (error) {
      next(error);
    }
  }

  // Session-based cart methods (no authentication required)
  async getSessionCart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionCart = (req as any).session?.cart || { items: [] };

      // Populate with product data
      const populatedItems = [];
      for (const item of sessionCart.items) {
        try {
          const product = await cartService.getProductById(item.productId);
          if (product) {
            populatedItems.push({
              id: item.id,
              productId: item.productId,
              quantity: item.quantity,
              product
            });
          }
        } catch (error) {
          // Skip invalid products
        }
      }

      const totalItems = populatedItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalPrice = populatedItems.reduce((sum, item) => 
        sum + (Number(item.product?.price) || 0) * item.quantity, 0
      );

      return res.status(200).json({
        success: true,
        data: {
          id: 'session',
          items: populatedItems,
          totalItems,
          totalPrice
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async addToSessionCart(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { productId, quantity = 1 } = req.body;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
      }

      // Verify product exists
      const product = await cartService.getProductById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Initialize cart if not exists (temporarily use req as any to bypass session typing)
      if (!(req as any).session) {
        (req as any).session = {};
      }
      if (!(req as any).session.cart) {
        (req as any).session.cart = { items: [] };
      }

      // Check if item already exists
      const existingItemIndex = (req as any).session.cart.items.findIndex(
        (item: any) => item.productId === productId
      );

      if (existingItemIndex >= 0) {
        // Update quantity
        (req as any).session.cart.items[existingItemIndex].quantity += quantity;
      } else {
        // Add new item
        (req as any).session.cart.items.push({
          id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          productId,
          quantity
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Product added to cart',
        data: { productId, quantity }
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSessionCartItem(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { productId } = req.params;
      const { quantity } = req.body;

      if (!(req as any).session?.cart || !(req as any).session.cart.items) {
        return res.status(404).json({
          success: false,
          message: 'Cart not found'
        });
      }

      const itemIndex = (req as any).session.cart.items.findIndex(
        (item: any) => item.productId === productId
      );

      if (itemIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Item not found in cart'
        });
      }

      (req as any).session.cart.items[itemIndex].quantity = quantity;

      return res.status(200).json({
        success: true,
        message: 'Cart item updated',
        data: { productId, quantity }
      });
    } catch (error) {
      next(error);
    }
  }

  async removeFromSessionCart(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { productId } = req.params;

      if (!(req as any).session?.cart || !(req as any).session.cart.items) {
        return res.status(404).json({
          success: false,
          message: 'Cart not found'
        });
      }

      const itemIndex = (req as any).session.cart.items.findIndex(
        (item: any) => item.productId === productId
      );

      if (itemIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Item not found in cart'
        });
      }

      (req as any).session.cart.items.splice(itemIndex, 1);

      return res.status(200).json({
        success: true,
        message: 'Item removed from cart'
      });
    } catch (error) {
      next(error);
    }
  }

  async clearSessionCart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!(req as any).session) {
        (req as any).session = {};
      }
      (req as any).session.cart = { items: [] };

      return res.status(200).json({
        success: true,
        message: 'Cart cleared'
      });
    } catch (error) {
      next(error);
    }
  }
}

export const cartController = new CartController();