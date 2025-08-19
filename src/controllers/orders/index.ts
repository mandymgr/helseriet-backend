import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { AppError } from '@/middleware/errorHandler';
import prisma from '@/config/database';

interface CreateOrderData {
  billingAddress: {
    firstName: string;
    lastName: string;
    company?: string;
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  shippingAddress?: {
    firstName: string;
    lastName: string;
    company?: string;
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  email: string;
  phone?: string;
  notes?: string;
}

class OrderController {
  async getUserOrders(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        throw new AppError('Bruker ikke autentisert', 401);
      }

      const { page = 1, limit = 10 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const [orders, totalCount] = await Promise.all([
        prisma.order.findMany({
          where: { userId },
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                product: {
                  include: {
                    images: {
                      take: 1,
                      orderBy: { sortOrder: 'asc' }
                    }
                  }
                }
              }
            }
          }
        }),
        prisma.order.count({ where: { userId } })
      ]);

      res.status(200).json({
        success: true,
        data: {
          orders,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / Number(limit))
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { orderId } = req.params;
      
      if (!userId) {
        throw new AppError('Bruker ikke autentisert', 401);
      }

      if (!orderId) {
        throw new AppError('Ordre ID er påkrevd', 400);
      }

      const order = await prisma.order.findFirst({
        where: { 
          id: orderId,
          userId 
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: {
                    take: 1,
                    orderBy: { sortOrder: 'asc' }
                  }
                }
              }
            }
          },
          payments: true,
          shipments: true
        }
      });

      if (!order) {
        throw new AppError('Ordre ikke funnet', 404);
      }

      res.status(200).json({
        success: true,
        data: order
      });
    } catch (error) {
      next(error);
    }
  }

  async createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        throw new AppError('Bruker ikke autentisert', 401);
      }

      const orderData: CreateOrderData = req.body;

      // Validate required fields
      if (!orderData.billingAddress || !orderData.email) {
        throw new AppError('Fakturaadresse og e-post er påkrevd', 400);
      }

      // Get user's cart
      const cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });

      if (!cart || cart.items.length === 0) {
        throw new AppError('Handlekurven er tom', 400);
      }

      // Calculate totals
      let subtotal = 0;
      const orderItems: Array<{
        productId: string;
        quantity: number;
        price: number;
        totalPrice: number;
        productName: string;
        productSku: string;
        productImage: string | null;
      }> = [];

      for (const item of cart.items) {
        // Check stock availability
        if (item.product.quantity < item.quantity) {
          throw new AppError(`Ikke nok på lager av ${item.product.name}`, 400);
        }

        const itemTotal = Number(item.product.price) * item.quantity;
        subtotal += itemTotal;

        orderItems.push({
          productId: item.productId,
          quantity: item.quantity,
          price: Number(item.product.price),
          totalPrice: itemTotal,
          productName: item.product.name,
          productSku: item.product.sku,
          productImage: null // Images will be handled separately
        });
      }

      // Calculate shipping (free over 1500 kr)
      const shippingAmount = subtotal >= 1500 ? 0 : 99;
      const totalAmount = subtotal + shippingAmount;

      // Generate unique order number
      const orderNumber = `HS-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create order in transaction
      const order = await prisma.$transaction(async (tx) => {
        // Create order
        const newOrder = await tx.order.create({
          data: {
            orderNumber,
            userId,
            status: 'PENDING',
            paymentStatus: 'PENDING',
            fulfillmentStatus: 'UNFULFILLED',
            
            subtotal,
            shippingAmount,
            totalAmount,
            
            email: orderData.email,
            phone: orderData.phone || null,
            
            // Billing address
            billingFirstName: orderData.billingAddress.firstName,
            billingLastName: orderData.billingAddress.lastName,
            billingCompany: orderData.billingAddress.company || null,
            billingStreet: orderData.billingAddress.street,
            billingCity: orderData.billingAddress.city,
            billingState: orderData.billingAddress.state || null,
            billingPostalCode: orderData.billingAddress.postalCode,
            billingCountry: orderData.billingAddress.country,
            
            // Shipping address (same as billing if not provided)
            shippingFirstName: orderData.shippingAddress?.firstName || orderData.billingAddress.firstName,
            shippingLastName: orderData.shippingAddress?.lastName || orderData.billingAddress.lastName,
            shippingCompany: orderData.shippingAddress?.company || orderData.billingAddress.company || null,
            shippingStreet: orderData.shippingAddress?.street || orderData.billingAddress.street,
            shippingCity: orderData.shippingAddress?.city || orderData.billingAddress.city,
            shippingState: orderData.shippingAddress?.state || orderData.billingAddress.state || null,
            shippingPostalCode: orderData.shippingAddress?.postalCode || orderData.billingAddress.postalCode,
            shippingCountry: orderData.shippingAddress?.country || orderData.billingAddress.country,
            
            notes: orderData.notes || null
          }
        });

        // Create order items
        await tx.orderItem.createMany({
          data: orderItems.map(item => ({
            orderId: newOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            totalPrice: item.totalPrice,
            productName: item.productName,
            productSku: item.productSku,
            productImage: item.productImage
          }))
        });

        // Update product quantities
        for (const item of cart.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              quantity: {
                decrement: item.quantity
              }
            }
          });
        }

        // Clear cart
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id }
        });

        return newOrder;
      });

      res.status(201).json({
        success: true,
        message: 'Ordre opprettet',
        data: { orderId: order.id, orderNumber: order.orderNumber }
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { orderId } = req.params;
      
      if (!userId) {
        throw new AppError('Bruker ikke autentisert', 401);
      }

      if (!orderId) {
        throw new AppError('Ordre ID er påkrevd', 400);
      }

      const order = await prisma.order.findUnique({
        where: { 
          id: orderId
        },
        include: {
          items: true
        }
      });

      if (!order || order.userId !== userId) {
        throw new AppError('Ordre ikke funnet', 404);
      }

      if (order.status !== 'PENDING') {
        throw new AppError('Kan ikke kansellere ordre som ikke er pending', 400);
      }

      // Cancel order and restore inventory
      await prisma.$transaction(async (tx) => {
        // Update order status
        await tx.order.update({
          where: { id: orderId },
          data: { 
            status: 'CANCELLED',
            fulfillmentStatus: 'UNFULFILLED'
          }
        });

        // Restore product quantities
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              quantity: {
                increment: item.quantity
              }
            }
          });
        }
      });

      res.status(200).json({
        success: true,
        message: 'Ordre kansellert'
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllOrders(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      if (!userId) {
        throw new AppError('Bruker ikke autentisert', 401);
      }

      if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        throw new AppError('Ingen tilgang til alle ordrer', 403);
      }

      const { 
        page = 1, 
        limit = 20,
        status,
        paymentStatus,
        search
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      
      const where: any = {};
      
      if (status && status !== 'all') {
        where.status = status;
      }
      
      if (paymentStatus && paymentStatus !== 'all') {
        where.paymentStatus = paymentStatus;
      }

      if (search) {
        where.OR = [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { billingFirstName: { contains: search, mode: 'insensitive' } },
          { billingLastName: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [orders, totalCount] = await Promise.all([
        prisma.order.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    images: {
                      take: 1,
                      orderBy: { sortOrder: 'asc' }
                    }
                  }
                }
              }
            }
          }
        }),
        prisma.order.count({ where })
      ]);

      res.status(200).json({
        success: true,
        data: {
          orders,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / Number(limit))
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async updateOrderStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const { orderId } = req.params;
      const { status, paymentStatus, fulfillmentStatus } = req.body;
      
      if (!userId) {
        throw new AppError('Bruker ikke autentisert', 401);
      }

      if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
        throw new AppError('Ingen tilgang til å oppdatere ordrer', 403);
      }

      if (!orderId) {
        throw new AppError('Ordre ID er påkrevd', 400);
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId }
      });

      if (!order) {
        throw new AppError('Ordre ikke funnet', 404);
      }

      const updateData: any = {};
      
      if (status) updateData.status = status;
      if (paymentStatus) updateData.paymentStatus = paymentStatus;
      if (fulfillmentStatus) updateData.fulfillmentStatus = fulfillmentStatus;

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: updateData,
        include: {
          items: {
            include: {
              product: {
                select: { name: true }
              }
            }
          }
        }
      });

      res.status(200).json({
        success: true,
        message: 'Ordre oppdatert',
        data: updatedOrder
      });
    } catch (error) {
      next(error);
    }
  }
}

export const orderController = new OrderController();