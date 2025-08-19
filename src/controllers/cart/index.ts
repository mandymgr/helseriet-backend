import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/middleware/errorHandler';
import prisma from '@/config/database';
import { AuthenticatedRequest } from '@/middleware/auth';

class CartController {
  async getCart(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        throw new AppError('Bruker ikke autentisert', 401);
      }

      // Get or create cart
      let cart = await prisma.cart.findUnique({
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
                  }
                }
              }
            }
          }
        }
      });

      if (!cart) {
        cart = await prisma.cart.create({
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
                    }
                  }
                }
              }
            }
          }
        });
      }

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
      const { productId, quantity = 1 } = req.body;

      if (!userId) {
        throw new AppError('Bruker ikke autentisert', 401);
      }

      if (!productId) {
        throw new AppError('Produkt-ID er påkrevd', 400);
      }

      // Verify product exists and is active
      const product = await prisma.product.findUnique({
        where: { id: productId }
      });

      if (!product || !product.isActive) {
        throw new AppError('Produkt ikke funnet eller ikke tilgjengelig', 404);
      }

      // Check stock
      if (product.quantity < quantity) {
        throw new AppError('Ikke nok på lager', 400);
      }

      // Get or create cart
      let cart = await prisma.cart.findUnique({
        where: { userId }
      });

      if (!cart) {
        cart = await prisma.cart.create({
          data: { userId }
        });
      }

      // Check if item already exists in cart
      const existingItem = await prisma.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId
          }
        }
      });

      let cartItem;
      if (existingItem) {
        // Update quantity
        const newQuantity = existingItem.quantity + quantity;
        if (product.quantity < newQuantity) {
          throw new AppError('Ikke nok på lager', 400);
        }

        cartItem = await prisma.cartItem.update({
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
        cartItem = await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            quantity
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

      res.status(200).json({
        success: true,
        message: 'Produkt lagt til i handlekurv',
        data: cartItem
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCartItem(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { itemId } = req.params;
      const { quantity } = req.body;

      if (!userId) {
        throw new AppError('Bruker ikke autentisert', 401);
      }

      if (!itemId) {
        throw new AppError('Item ID er påkrevd', 400);
      }

      if (quantity < 1) {
        throw new AppError('Antall må være minst 1', 400);
      }

      // Find cart item and verify ownership
      const cartItem = await prisma.cartItem.findFirst({
        where: {
          id: itemId,
          cart: { userId }
        },
        include: {
          product: true
        }
      });

      if (!cartItem) {
        throw new AppError('Handlekurv-element ikke funnet', 404);
      }

      // Check stock
      if (cartItem.product.quantity < quantity) {
        throw new AppError('Ikke nok på lager', 400);
      }

      const updatedItem = await prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity },
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

      res.status(200).json({
        success: true,
        message: 'Handlekurv oppdatert',
        data: updatedItem
      });
    } catch (error) {
      next(error);
    }
  }

  async removeFromCart(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { itemId } = req.params;

      if (!userId) {
        throw new AppError('Bruker ikke autentisert', 401);
      }

      if (!itemId) {
        throw new AppError('Item ID er påkrevd', 400);
      }

      // Find cart item and verify ownership
      const cartItem = await prisma.cartItem.findFirst({
        where: {
          id: itemId,
          cart: { userId }
        }
      });

      if (!cartItem) {
        throw new AppError('Handlekurv-element ikke funnet', 404);
      }

      await prisma.cartItem.delete({
        where: { id: itemId }
      });

      res.status(200).json({
        success: true,
        message: 'Produkt fjernet fra handlekurv'
      });
    } catch (error) {
      next(error);
    }
  }

  async clearCart(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('Bruker ikke autentiseret', 401);
      }

      // Find user's cart
      const cart = await prisma.cart.findUnique({
        where: { userId }
      });

      if (cart) {
        await prisma.cartItem.deleteMany({
          where: { cartId: cart.id }
        });
      }

      res.status(200).json({
        success: true,
        message: 'Handlekurv tømt'
      });
    } catch (error) {
      next(error);
    }
  }
}

export const cartController = new CartController();