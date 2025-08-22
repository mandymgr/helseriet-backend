import { Request, Response, NextFunction } from 'express';
import { klarnaService, paymentService } from '@/services/payments';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger.simple';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class KlarnaController {
  // Handle Klarna webhook notifications (push URL)
  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { order_id, event_type } = req.body;
      
      logger.info('Klarna webhook received', { order_id, event_type });

      // Validate the webhook payload
      if (!order_id) {
        throw new AppError('Ugyldig webhook payload fra Klarna', 400);
      }

      // Get order details from Klarna
      const klarnaOrder = await klarnaService.getOrderDetails(order_id);
      
      // Find the order in our database
      const order = await prisma.order.findFirst({
        where: { orderNumber: order_id },
        include: { payments: true }
      });

      if (!order) {
        logger.warn('Klarna webhook: Order not found', { order_id });
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      // Update payment status based on Klarna status
      const payment = order.payments.find(p => p.provider === 'klarna');
      if (!payment) {
        logger.warn('Klarna webhook: Payment record not found', { order_id });
        res.status(404).json({ error: 'Payment record not found' });
        return;
      }

      let newPaymentStatus = 'PENDING';
      let newOrderStatus = order.status;

      switch (klarnaOrder.status) {
        case 'authorized':
          newPaymentStatus = 'COMPLETED';
          newOrderStatus = 'CONFIRMED';
          // Acknowledge the order as required by Klarna
          await klarnaService.acknowledgeOrder(order_id);
          break;
        case 'captured':
          newPaymentStatus = 'PAID';
          newOrderStatus = 'PROCESSING';
          break;
        case 'cancelled':
          newPaymentStatus = 'CANCELLED';
          newOrderStatus = 'CANCELLED';
          break;
        case 'expired':
          newPaymentStatus = 'FAILED';
          newOrderStatus = 'CANCELLED';
          break;
        default:
          logger.warn('Unknown Klarna order status', { status: klarnaOrder.status });
      }

      // Update payment and order status
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: newPaymentStatus as any,
            transactionId: order_id,
            confirmedAt: klarnaOrder.status === 'authorized' ? new Date() : null,
            metadata: klarnaOrder as any
          }
        }),
        prisma.order.update({
          where: { id: order.id },
          data: {
            status: newOrderStatus as any,
            paymentStatus: newPaymentStatus as any
          }
        })
      ]);

      logger.info('Klarna webhook processed successfully', {
        order_id,
        oldStatus: payment.status,
        newStatus: newPaymentStatus
      });

      res.status(200).json({ success: true });
    } catch (error) {
      logger.error('Klarna webhook error', error);
      next(error);
    }
  }

  // Get checkout order details
  async getCheckoutOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        throw new AppError('Order ID er påkrevd', 400);
      }

      const checkoutOrder = await klarnaService.getCheckoutOrder(orderId);
      
      res.json({
        success: true,
        data: {
          orderId: checkoutOrder.order_id,
          status: checkoutOrder.status,
          amount: checkoutOrder.order_amount / 100,
          currency: checkoutOrder.purchase_currency,
          htmlSnippet: checkoutOrder.html_snippet,
          expiresAt: checkoutOrder.expires_at
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update checkout order
  async updateCheckoutOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const updateData = req.body;

      if (!orderId) {
        throw new AppError('Order ID er påkrevd', 400);
      }

      const updatedOrder = await klarnaService.updateCheckoutOrder(orderId, updateData);
      
      res.json({
        success: true,
        data: {
          orderId: updatedOrder.order_id,
          status: updatedOrder.status,
          htmlSnippet: updatedOrder.html_snippet
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get order management details
  async getOrderDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        throw new AppError('Order ID er påkrevd', 400);
      }

      const orderDetails = await klarnaService.getOrderDetails(orderId);
      
      res.json({
        success: true,
        data: {
          orderId: orderDetails.order_id,
          status: klarnaService.getStandardStatus(orderDetails.status),
          amount: orderDetails.order_amount / 100,
          currency: orderDetails.purchase_currency,
          orderLines: orderDetails.order_lines,
          billingAddress: orderDetails.billing_address,
          shippingAddress: orderDetails.shipping_address
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Capture an authorized order
  async captureOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const { amount, description } = req.body;

      if (!orderId) {
        throw new AppError('Order ID er påkrevd', 400);
      }

      const captureData = {
        captured_amount: Math.round(amount * 100), // Convert to øre
        description: description || 'Ordre fullført'
      };

      const result = await klarnaService.captureOrder(orderId, captureData);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Cancel an order
  async cancelOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        throw new AppError('Order ID er påkrevd', 400);
      }

      await klarnaService.cancelOrder(orderId);
      
      res.json({
        success: true,
        message: 'Ordre kansellert'
      });
    } catch (error) {
      next(error);
    }
  }

  // Create refund
  async createRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const { amount, description } = req.body;

      if (!orderId) {
        throw new AppError('Order ID er påkrevd', 400);
      }

      const refundData = {
        refunded_amount: Math.round(amount * 100), // Convert to øre
        description: description || 'Refundering'
      };

      const result = await klarnaService.createRefund(orderId, refundData);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

export const klarnaController = new KlarnaController();