import Stripe from 'stripe';
import { AppError } from '@/middleware/errorHandler';

class StripeService {
  public stripe: Stripe; // Expose stripe instance for advanced operations

  constructor() {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY er ikke konfigurert');
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-07-30.basil'
    });
  }

  async createPaymentIntent(amount: number, currency: string = 'nok', metadata: any = {}) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe uses øre/cents
        currency: currency.toLowerCase(),
        automatic_payment_methods: {
          enabled: true
        },
        metadata
      });

      return {
        clientSecret: paymentIntent.client_secret,
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      };
    } catch (error: any) {
      throw new AppError(`Stripe feil: ${error.message}`, 500);
    }
  }

  async confirmPayment(paymentIntentId: string) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      };
    } catch (error: any) {
      throw new AppError(`Stripe feil: ${error.message}`, 500);
    }
  }

  async cancelPayment(paymentIntentId: string) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);
      return {
        id: paymentIntent.id,
        status: paymentIntent.status
      };
    } catch (error: any) {
      throw new AppError(`Stripe feil: ${error.message}`, 500);
    }
  }

  async createCustomer(email: string, name: string, metadata: any = {}) {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata
      });

      return {
        id: customer.id,
        email: customer.email,
        name: customer.name
      };
    } catch (error: any) {
      throw new AppError(`Stripe feil: ${error.message}`, 500);
    }
  }

  async processWebhook(body: string, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new AppError('STRIPE_WEBHOOK_SECRET er ikke konfigurert', 500);
    }

    try {
      const event = this.stripe.webhooks.constructEvent(body, signature, webhookSecret);
      return event;
    } catch (error: any) {
      throw new AppError(`Webhook signatur verifisering feilet: ${error.message}`, 400);
    }
  }
}

export const stripeService = new StripeService();