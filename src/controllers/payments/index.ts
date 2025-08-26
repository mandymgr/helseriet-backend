// Payment controller with proper TypeScript typing
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { stripeService } from '@/services/payments/stripe';
import { cartService } from '@/services/cart.service';
import { orderService } from '@/services/order.service';

// Use proper express-session types
import 'express-session';
interface SessionRequest extends Request {
  session: Request['session'];
}

interface PaymentIntentRequest {
  email: string;
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
  phone?: string;
  notes?: string;
}

class PaymentController {
  // Create payment intent for session cart (no auth required)
  async createSessionPaymentIntent(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
    try {
      const sessionCart = (req as SessionRequest).session?.cart;
      if (!sessionCart?.items || sessionCart.items.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Handlekurven er tom'
        });
        return;
      }

      // Calculate total from session cart
      let totalAmount = 0;
      for (const item of sessionCart.items) {
        try {
          const product = await cartService.getProductById(item.productId);
          if (product) {
            totalAmount += Number(product.price) * item.quantity;
          }
        } catch (error) {
          // Skip invalid products
        }
      }

      if (totalAmount <= 0) {
        res.status(400).json({
          success: false,
          message: 'Ugyldig handlekurv total'
        });
      }

      const { email, billingAddress, shippingAddress, phone, notes } = req.body as PaymentIntentRequest;

      // Create payment intent
      const paymentIntent = await stripeService.createPaymentIntent(
        totalAmount,
        'nok',
        {
          cart_type: 'session',
          customer_email: email,
          billing_name: `${billingAddress.firstName} ${billingAddress.lastName}`,
          billing_address: JSON.stringify(billingAddress),
          shipping_address: shippingAddress ? JSON.stringify(shippingAddress) : null,
          phone: phone || null,
          notes: notes || null,
          cart_items: JSON.stringify(sessionCart.items)
        }
      );

      res.status(200).json({
        success: true,
        data: {
          clientSecret: paymentIntent.clientSecret,
          paymentIntentId: paymentIntent.id,
          amount: totalAmount
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Create payment intent for authenticated user cart
  async createPaymentIntent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const cart = await cartService.getOrCreateCart(userId);
      if (!cart || cart.items.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Handlekurven er tom'
        });
        return;
      }

      // Calculate total
      const totalAmount = cart.items.reduce((sum, item) => {
        return sum + (Number(item.product?.price) || 0) * item.quantity;
      }, 0);

      if (totalAmount <= 0) {
        res.status(400).json({
          success: false,
          message: 'Ugyldig handlekurv total'
        });
      }

      const { email, billingAddress, shippingAddress, phone, notes } = req.body as PaymentIntentRequest;

      // Create payment intent
      const paymentIntent = await stripeService.createPaymentIntent(
        totalAmount,
        'nok',
        {
          cart_type: 'user',
          user_id: userId,
          cart_id: cart.id,
          customer_email: email,
          billing_name: `${billingAddress.firstName} ${billingAddress.lastName}`,
          billing_address: JSON.stringify(billingAddress),
          shipping_address: shippingAddress ? JSON.stringify(shippingAddress) : null,
          phone: phone || null,
          notes: notes || null
        }
      );

      res.status(200).json({
        success: true,
        data: {
          clientSecret: paymentIntent.clientSecret,
          paymentIntentId: paymentIntent.id,
          amount: totalAmount
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Confirm payment and create order
  async confirmPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { paymentIntentId } = req.body;
      
      if (!paymentIntentId) {
        res.status(400).json({
          success: false,
          message: 'Payment Intent ID er påkrevd'
        });
      }

      // Confirm payment with Stripe
      const payment = await stripeService.confirmPayment(paymentIntentId || '');
      
      if (payment.status !== 'succeeded') {
        res.status(400).json({
          success: false,
          message: 'Betalingen ble ikke fullført',
          data: { status: payment.status }
        });
      }

      // Get payment intent details to extract metadata
      const paymentIntentDetails = await stripeService.stripe.paymentIntents.retrieve(paymentIntentId);
      const metadata = paymentIntentDetails.metadata;

      // Create order based on cart type
      let order;
      if (metadata.cart_type === 'session') {
        // Create order from session cart
        const orderData = {
          email: metadata.customer_email || '',
          billingAddress: JSON.parse(metadata.billing_address || '{}'),
          shippingAddress: metadata.shipping_address ? JSON.parse(metadata.shipping_address) : undefined,
          phone: metadata.phone || '',
          notes: metadata.notes || '',
          items: JSON.parse(metadata.cart_items || '[]'),
          paymentIntentId,
          totalAmount: payment.amount / 100 // Convert from øre to NOK
        };
        
        order = await orderService.createSessionOrder(orderData);
        
        // Clear session cart
        const sessionReq = req as SessionRequest;
        if (sessionReq.session?.cart) {
          sessionReq.session.cart = { items: [] };
        }
      } else if (metadata.cart_type === 'user') {
        // Create order from user cart
        const orderData = {
          email: metadata.customer_email || '',
          billingAddress: JSON.parse(metadata.billing_address || '{}'),
          shippingAddress: metadata.shipping_address ? JSON.parse(metadata.shipping_address) : undefined,
          phone: metadata.phone || '',
          notes: metadata.notes || '',
          paymentIntentId,
          totalAmount: payment.amount / 100 // Convert from øre to NOK
        };
        
        order = await orderService.createOrderFromCart(metadata.user_id || '', orderData);
        
        // Clear user cart
        await cartService.clearCart(metadata.user_id || '');
      }

      res.status(200).json({
        success: true,
        message: 'Betaling bekreftet og ordre opprettet',
        data: {
          payment: {
            id: payment.id,
            status: payment.status,
            amount: payment.amount / 100
          },
          order
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Handle Stripe webhooks
  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'] as string;
      if (!signature) {
        res.status(400).json({
          success: false,
          message: 'Manglende Stripe signatur'
        });
      }

      const event = await stripeService.processWebhook(req.body, signature);

      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          // Payment was successful
          console.log('Betaling fullført:', event.data.object.id);
          break;
        case 'payment_intent.payment_failed':
          // Payment failed
          console.log('Betaling feilet:', event.data.object.id);
          break;
        default:
          console.log('Ukjent webhook event type:', event.type);
      }

      res.status(200).json({
        success: true,
        message: 'Webhook processed'
      });
    } catch (error) {
      next(error);
    }
  }

  // Get payment status
  async getPaymentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { paymentIntentId } = req.params;
      
      if (!paymentIntentId) {
        res.status(400).json({
          success: false,
          message: 'Payment Intent ID er påkrevd'
        });
      }

      const payment = await stripeService.confirmPayment(paymentIntentId || '');
      
      res.status(200).json({
        success: true,
        data: {
          id: payment.id,
          status: payment.status,
          amount: payment.amount / 100,
          currency: payment.currency
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();