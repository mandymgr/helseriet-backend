import { Request, Response, NextFunction } from 'express';
import { vippsService, paymentService } from '@/services/payments';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger.simple';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class VippsController {
  // Handle Vipps webhook notifications
  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { orderId, transactionInfo } = req.body;
      
      logger.info('Vipps webhook received', { orderId, status: transactionInfo?.status });

      // Validate the webhook payload
      if (!orderId || !transactionInfo) {
        throw new AppError('Ugyldig webhook payload fra Vipps', 400);
      }

      // Find the order in our database
      const order = await prisma.order.findFirst({
        where: { orderNumber: orderId },
        include: { payments: true }
      });

      if (!order) {
        logger.warn('Vipps webhook: Order not found', { orderId });
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      // Update payment status based on Vipps status
      const payment = order.payments.find(p => p.provider === 'vipps');
      if (!payment) {
        logger.warn('Vipps webhook: Payment record not found', { orderId });
        res.status(404).json({ error: 'Payment record not found' });
        return;
      }

      let newPaymentStatus = 'PENDING';
      let newOrderStatus = order.status;

      switch (transactionInfo.status) {
        case 'AUTHORIZED':
          newPaymentStatus = 'COMPLETED';
          newOrderStatus = 'CONFIRMED';
          break;
        case 'CANCELLED':
          newPaymentStatus = 'CANCELLED';
          newOrderStatus = 'CANCELLED';
          break;
        case 'EXPIRED':
          newPaymentStatus = 'FAILED';
          newOrderStatus = 'CANCELLED';
          break;
        case 'REJECTED':
          newPaymentStatus = 'FAILED';
          newOrderStatus = 'CANCELLED';
          break;
        default:
          logger.warn('Unknown Vipps transaction status', { status: transactionInfo.status });
      }

      // Update payment and order status
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: newPaymentStatus as any,
            transactionId: transactionInfo.transactionId,
            confirmedAt: transactionInfo.status === 'AUTHORIZED' ? new Date() : null,
            metadata: transactionInfo
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

      logger.info('Vipps webhook processed successfully', {
        orderId,
        oldStatus: payment.status,
        newStatus: newPaymentStatus
      });

      res.status(200).json({ success: true });
    } catch (error) {
      logger.error('Vipps webhook error', error);
      next(error);
    }
  }

  // Get payment status for an order
  async getPaymentStatus(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        throw new AppError('Order ID er påkrevd', 400);
      }

      const paymentStatus = await vippsService.getPaymentStatus(orderId);
      
      res.json({
        success: true,
        data: {
          orderId: paymentStatus.orderId,
          status: vippsService.getStandardStatus(paymentStatus.transactionInfo.status),
          amount: paymentStatus.transactionInfo.amount / 100,
          transactionId: paymentStatus.transactionInfo.transactionId,
          timestamp: paymentStatus.transactionInfo.timeStamp
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Capture a Vipps payment (for reserved payments)
  async capturePayment(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { orderId } = req.params;
      const { amount, description } = req.body;

      if (!orderId) {
        throw new AppError('Order ID er påkrevd', 400);
      }

      const result = await vippsService.capturePayment(orderId, amount, description);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Cancel a Vipps payment
  async cancelPayment(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const { orderId } = req.params;
      const { description } = req.body;

      if (!orderId) {
        throw new AppError('Order ID er påkrevd', 400);
      }

      const result = await vippsService.cancelPayment(orderId, description);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

export const vippsController = new VippsController();