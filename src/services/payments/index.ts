import { stripeService } from './stripe';
import { vippsService } from './vipps';
import { klarnaService, KlarnaService } from './klarna';
import { AppError } from '@/middleware/errorHandler';

export enum PaymentProvider {
  STRIPE = 'stripe',
  VIPPS = 'vipps',
  KLARNA = 'klarna',
  CARD = 'card'
}

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  amount: number;
  currency: string;
  status: string;
  provider: PaymentProvider;
  clientSecret?: string | undefined;
  checkoutUrl?: string | undefined; // For Klarna checkout
  htmlSnippet?: string | undefined; // For Klarna embedded checkout
}

class PaymentService {
  async createPayment(
    provider: PaymentProvider,
    amount: number,
    currency: string = 'nok',
    orderId: string,
    customerEmail: string,
    items?: Array<{name: string, quantity: number, price: number}>,
    customerData?: {firstName?: string, lastName?: string, address?: any}
  ): Promise<PaymentResult> {
    const metadata = {
      orderId,
      customerEmail,
      provider
    };

    switch (provider) {
      case PaymentProvider.STRIPE:
      case PaymentProvider.CARD:
        const paymentIntent = await stripeService.createPaymentIntent(amount, currency, metadata);
        return {
          success: true,
          transactionId: paymentIntent.id,
          amount: paymentIntent.amount / 100, // Convert back from øre
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          provider: PaymentProvider.STRIPE,
          clientSecret: paymentIntent.clientSecret || undefined
        };

      case PaymentProvider.VIPPS:
        const vippsPayment = await vippsService.createPayment({
          amount,
          currency,
          orderId,
          description: `Ordre #${orderId} - Helseriet`,
          redirectUrl: `${process.env.FRONTEND_URL}/payment/success?orderId=${orderId}`
        });
        return {
          success: true,
          transactionId: vippsPayment.orderId,
          amount,
          currency,
          status: 'initiated',
          provider: PaymentProvider.VIPPS,
          clientSecret: vippsPayment.url // Vipps uses URL instead of client secret
        };

      case PaymentProvider.KLARNA:
        if (!items || items.length === 0) {
          throw new AppError('Klarna krever produktlinjer (items)', 400);
        }
        
        const orderLines = KlarnaService.createOrderLines(items);
        const totalAmount = Math.round(amount * 100); // Convert to øre
        const taxAmount = Math.round(totalAmount * 0.2); // Estimate 20% tax
        
        const klarnaOrder = await klarnaService.createCheckoutOrder({
          purchase_country: 'NO',
          purchase_currency: currency.toUpperCase(),
          locale: 'nb-NO',
          order_amount: totalAmount,
          order_tax_amount: taxAmount,
          order_lines: orderLines,
          merchant_urls: {
            terms: `${process.env.FRONTEND_URL}/terms`,
            checkout: `${process.env.FRONTEND_URL}/checkout?orderId=${orderId}`,
            confirmation: `${process.env.FRONTEND_URL}/confirmation?orderId=${orderId}`,
            push: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/payments/webhooks/klarna`
          }
        });
        
        return {
          success: true,
          transactionId: klarnaOrder.order_id,
          amount,
          currency,
          status: 'checkout_incomplete',
          provider: PaymentProvider.KLARNA,
          htmlSnippet: klarnaOrder.html_snippet,
          checkoutUrl: `${process.env.FRONTEND_URL}/checkout/klarna/${klarnaOrder.order_id}`
        };

      default:
        throw new AppError('Ukjent betalingsleverandør', 400);
    }
  }

  async confirmPayment(provider: PaymentProvider, transactionId: string): Promise<PaymentResult> {
    switch (provider) {
      case PaymentProvider.STRIPE:
      case PaymentProvider.CARD:
        const payment = await stripeService.confirmPayment(transactionId);
        return {
          success: payment.status === 'succeeded',
          transactionId: payment.id,
          amount: payment.amount / 100,
          currency: payment.currency,
          status: payment.status,
          provider: PaymentProvider.STRIPE
        };

      case PaymentProvider.VIPPS:
        const vippsStatus = await vippsService.getPaymentStatus(transactionId);
        return {
          success: vippsStatus.transactionInfo.status === 'AUTHORIZED',
          transactionId: vippsStatus.transactionInfo.transactionId,
          amount: vippsStatus.transactionInfo.amount / 100, // Convert from øre
          currency: 'nok',
          status: vippsService.getStandardStatus(vippsStatus.transactionInfo.status),
          provider: PaymentProvider.VIPPS
        };

      case PaymentProvider.KLARNA:
        const klarnaStatus = await klarnaService.getOrderDetails(transactionId);
        return {
          success: klarnaStatus.status === 'authorized' || klarnaStatus.status === 'captured',
          transactionId: klarnaStatus.order_id,
          amount: klarnaStatus.order_amount / 100, // Convert from øre
          currency: klarnaStatus.purchase_currency.toLowerCase(),
          status: klarnaService.getStandardStatus(klarnaStatus.status),
          provider: PaymentProvider.KLARNA
        };

      default:
        throw new AppError('Ukjent betalingsleverandør', 400);
    }
  }

  async cancelPayment(provider: PaymentProvider, transactionId: string): Promise<boolean> {
    switch (provider) {
      case PaymentProvider.STRIPE:
      case PaymentProvider.CARD:
        const result = await stripeService.cancelPayment(transactionId);
        return result.status === 'canceled';

      case PaymentProvider.VIPPS:
        const cancelResult = await vippsService.cancelPayment(transactionId, 'Ordre kansellert av kunde');
        return true; // Vipps API will throw error if cancellation fails

      case PaymentProvider.KLARNA:
        await klarnaService.cancelOrder(transactionId);
        return true; // Klarna API will throw error if cancellation fails

      default:
        throw new AppError('Ukjent betalingsleverandør', 400);
    }
  }

  getProviderFromString(providerString: string): PaymentProvider {
    switch (providerString.toLowerCase()) {
      case 'stripe':
      case 'card':
        return PaymentProvider.STRIPE;
      case 'vipps':
        return PaymentProvider.VIPPS;
      case 'klarna':
        return PaymentProvider.KLARNA;
      default:
        throw new AppError(`Ukjent betalingsleverandør: ${providerString}`, 400);
    }
  }
}

export const paymentService = new PaymentService();
export { stripeService, vippsService, klarnaService };