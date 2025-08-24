import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { AppError } from '@/middleware/errorHandler';
import { orderService } from '@/services/order.service';

/**
 * @swagger
 * /api/orders/user:
 *   get:
 *     summary: Get user's orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     orders:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Order'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create new order from user's cart
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               billingAddress:
 *                 type: object
 *                 properties:
 *                   firstName:
 *                     type: string
 *                   lastName:
 *                     type: string
 *                   company:
 *                     type: string
 *                     nullable: true
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                     nullable: true
 *                   postalCode:
 *                     type: string
 *                   country:
 *                     type: string
 *                 required: [firstName, lastName, street, city, postalCode, country]
 *               shippingAddress:
 *                 type: object
 *                 nullable: true
 *                 properties:
 *                   firstName:
 *                     type: string
 *                   lastName:
 *                     type: string
 *                   company:
 *                     type: string
 *                     nullable: true
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                     nullable: true
 *                   postalCode:
 *                     type: string
 *                   country:
 *                     type: string
 *                 description: If not provided, billing address will be used
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *                 nullable: true
 *               notes:
 *                 type: string
 *                 nullable: true
 *                 description: Special instructions for the order
 *             required: [billingAddress, email]
 *           example:
 *             billingAddress:
 *               firstName: "John"
 *               lastName: "Doe"
 *               street: "Storgata 1"
 *               city: "Oslo"
 *               postalCode: "0001"
 *               country: "Norge"
 *             email: "john@example.com"
 *             phone: "+47 12 34 56 78"
 *             notes: "Please leave at reception"
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Ordre opprettet"
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: string
 *                       format: uuid
 *                     orderNumber:
 *                       type: string
 *                       example: "HS-1234567890-ABC123"
 *       400:
 *         description: Validation error or empty cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

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