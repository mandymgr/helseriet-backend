import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { cartService } from '@/services/cart.service';

class CartController {
  async getCart(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const cart = await cartService.getOrCreateCart(userId);

      res.status(200).json({
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

      res.status(200).json({
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

      res.status(200).json({
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

      res.status(200).json({
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

      res.status(200).json({
        success: true,
        message: 'Cart cleared'
      });
    } catch (error) {
      next(error);
    }
  }
}

export const cartController = new CartController();