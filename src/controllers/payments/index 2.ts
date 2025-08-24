import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { AppError } from '@/middleware/errorHandler';
import { paymentService, PaymentProvider, stripeService } from '@/services/payments';
import prisma from '@/config/database';

class PaymentController {
  async createPaymentIntent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { orderId, provider = 'stripe' } = req.body;

      if (!userId) {
        throw new AppError('Bruker ikke autentisert', 401);
      }

      if (!orderId) {
        throw new AppError('Ordre ID er påkrevd', 400);
      }

      // Get order details
      const order = await prisma.order.findFirst({
        where: { 
          id: orderId,
          userId 
        }
      });

      if (!order) {
        throw new AppError('Ordre ikke funnet', 404);
      }

      if (order.paymentStatus !== 'PENDING') {
        throw new AppError('Ordre kan ikke betales', 400);
      }

      // Create payment intent
      const paymentProvider = paymentService.getProviderFromString(provider);
      const paymentResult = await paymentService.createPayment(
        paymentProvider,
        Number(order.totalAmount),
        'nok',
        orderId,
        order.email
      );

      // Save payment record
      const payment = await prisma.payment.create({
        data: {
          orderId: orderId as string,
          method: paymentProvider === PaymentProvider.STRIPE ? 'CREDIT_CARD' : 'VIPPS',
          provider: paymentProvider,
          transactionId: paymentResult.transactionId,
          amount: paymentResult.amount,
          currency: paymentResult.currency,
          status: 'PENDING',
          clientSecret: paymentResult.clientSecret || null
        }
      });

      res.status(201).json({
        success: true,
        message: 'Payment intent opprettet',
        data: {
          paymentId: payment.id,
          clientSecret: paymentResult.clientSecret,
          amount: paymentResult.amount,
          currency: paymentResult.currency
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async confirmPayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { paymentId } = req.params;

      if (!userId) {
        throw new AppError('Bruker ikke autentiseret', 401);
      }

      if (!paymentId) {
        throw new AppError('Payment ID er påkrevd', 400);
      }

      // Get payment record
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId as string },
        include: {
          order: true
        }
      });

      if (!payment || payment.order.userId !== userId) {
        throw new AppError('Betaling ikke funnet', 404);
      }

      // Confirm payment with provider
      const paymentResult = await paymentService.confirmPayment(
        payment.provider as PaymentProvider,
        payment.transactionId || ''
      );

      // Update payment and order status
      await prisma.$transaction(async (tx) => {
        // Update payment record
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: paymentResult.success ? 'COMPLETED' : 'FAILED',
            confirmedAt: paymentResult.success ? new Date() : null
          }
        });

        // Update order status if payment succeeded
        if (paymentResult.success) {
          await tx.order.update({
            where: { id: payment.orderId },
            data: {
              paymentStatus: 'PAID',
              status: 'CONFIRMED'
            }
          });
        }
      });

      res.status(200).json({
        success: paymentResult.success,
        message: paymentResult.success ? 'Betaling bekreftet' : 'Betaling feilet',
        data: {
          status: paymentResult.status,
          transactionId: paymentResult.transactionId
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getPaymentStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { paymentId } = req.params;

      if (!userId) {
        throw new AppError('Bruker ikke autentisert', 401);
      }

      const payment = await prisma.payment.findUnique({
        where: { id: paymentId as string },
        include: {
          order: true
        }
      });

      if (!payment || payment.order.userId !== userId) {
        throw new AppError('Betaling ikke funnet', 404);
      }

      res.status(200).json({
        success: true,
        data: {
          id: payment.id,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          provider: payment.provider,
          createdAt: payment.createdAt,
          confirmedAt: payment.confirmedAt,
          orderId: payment.orderId
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async handleStripeWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.headers['stripe-signature'] as string;
      const body = JSON.stringify(req.body);

      if (!signature) {
        throw new AppError('Mangler Stripe signatur', 400);
      }

      // Verify webhook signature
      const event = await stripeService.processWebhook(body, signature);

      // Handle different webhook events
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;

        case 'payment_intent.canceled':
          await this.handlePaymentCanceled(event.data.object);
          break;

        default:
          console.log(`Uhåndtert webhook event type: ${event.type}`);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  }

  private async handlePaymentSucceeded(paymentIntent: any) {
    const payment = await prisma.payment.findFirst({
      where: { transactionId: paymentIntent.id }
    });

    if (payment) {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'COMPLETED',
            confirmedAt: new Date()
          }
        });

        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: 'PAID',
            status: 'CONFIRMED'
          }
        });
      });
    }
  }

  private async handlePaymentFailed(paymentIntent: any) {
    const payment = await prisma.payment.findFirst({
      where: { transactionId: paymentIntent.id }
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED'
        }
      });
    }
  }

  private async handlePaymentCanceled(paymentIntent: any) {
    const payment = await prisma.payment.findFirst({
      where: { transactionId: paymentIntent.id }
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'CANCELLED'
        }
      });
    }
  }
}

export const paymentController = new PaymentController();