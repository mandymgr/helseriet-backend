import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { AppError } from '@/middleware/errorHandler';
import { orderService } from '@/services/order.service';

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

      const { page, limit } = req.query;
      const result = await orderService.getUserOrders(userId, { 
        page: Number(page), 
        limit: Number(limit) 
      });

      res.status(200).json({
        success: true,
        data: result
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

      const order = await orderService.getUserOrder(userId, orderId);

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
      const result = await orderService.createOrder(userId, orderData);

      res.status(201).json({
        success: true,
        message: 'Ordre opprettet',
        data: result
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

      await orderService.cancelOrder(userId, orderId);

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

      const { page, limit, status, paymentStatus, search } = req.query;
      
      const result = await orderService.getAllOrders(
        { 
          status: status as string, 
          paymentStatus: paymentStatus as string, 
          search: search as string 
        },
        { 
          page: Number(page) || 1, 
          limit: Number(limit) || 20 
        }
      );

      res.status(200).json({
        success: true,
        data: result
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

      const updatedOrder = await orderService.updateOrderStatus(orderId, {
        status,
        paymentStatus,
        fulfillmentStatus
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