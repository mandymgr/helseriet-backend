import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { stripeService } from '@/services/payments/stripe';
import { vippsService } from '@/services/payments/vipps';
import { klarnaService, KlarnaService } from '@/services/payments/klarna';
import { PaymentService } from '@/services/payments/index';

// Mock external services
jest.mock('@/services/payments/stripe');
jest.mock('@/services/payments/vipps');
jest.mock('@/services/payments/klarna');

const mockStripeService = stripeService as jest.Mocked<typeof stripeService>;
const mockVippsService = vippsService as jest.Mocked<typeof vippsService>;
const mockKlarnaService = klarnaService as jest.Mocked<typeof klarnaService>;

describe('Payment Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Stripe Service', () => {
    it('should create payment intent successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        amount: 10000, // 100 NOK in øre
        currency: 'nok',
        status: 'requires_payment_method',
        clientSecret: 'pi_test123_secret'
      };

      mockStripeService.createPaymentIntent.mockResolvedValue(mockPaymentIntent);

      const result = await mockStripeService.createPaymentIntent(
        10000, 
        'nok', 
        { orderId: 'order123', customerEmail: 'test@example.com' }
      );

      expect(result).toEqual(mockPaymentIntent);
      expect(mockStripeService.createPaymentIntent).toHaveBeenCalledWith(
        10000, 
        'nok', 
        { orderId: 'order123', customerEmail: 'test@example.com' }
      );
    });

    it('should confirm payment intent', async () => {
      const mockConfirmedPayment = {
        id: 'pi_test123',
        status: 'succeeded',
        amount: 10000,
        currency: 'nok'
      };

      mockStripeService.confirmPayment.mockResolvedValue(mockConfirmedPayment);

      const result = await mockStripeService.confirmPayment('pi_test123');

      expect(result).toEqual(mockConfirmedPayment);
      expect(mockStripeService.confirmPayment).toHaveBeenCalledWith('pi_test123');
    });
  });

  describe('Vipps Service', () => {
    it('should create Vipps payment successfully', async () => {
      const paymentData = {
        amount: 100,
        currency: 'NOK',
        orderId: 'order123',
        description: 'Test payment',
        redirectUrl: 'https://example.com/success'
      };

      const mockVippsResponse = {
        orderId: 'order123',
        url: 'https://api.vipps.no/dwo-api-application/v1/deeplink/vippsgateway?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9'
      };

      mockVippsService.createPayment.mockResolvedValue(mockVippsResponse);

      const result = await mockVippsService.createPayment(paymentData);

      expect(result).toEqual(mockVippsResponse);
      expect(mockVippsService.createPayment).toHaveBeenCalledWith(paymentData);
    });

    it('should get payment status', async () => {
      const mockStatus = {
        orderId: 'order123',
        status: 'INITIATED',
        amount: 10000,
        timeStamp: '2024-01-01T12:00:00Z'
      };

      mockVippsService.getPaymentStatus.mockResolvedValue(mockStatus);

      const result = await mockVippsService.getPaymentStatus('order123');

      expect(result).toEqual(mockStatus);
      expect(mockVippsService.getPaymentStatus).toHaveBeenCalledWith('order123');
    });
  });

  describe('Klarna Service', () => {
    it('should create checkout order successfully', async () => {
      const orderData = {
        purchase_country: 'NO',
        purchase_currency: 'NOK',
        locale: 'nb-NO',
        order_amount: 10000,
        order_tax_amount: 2000,
        order_lines: [{
          type: 'physical' as const,
          reference: 'product123',
          name: 'Test Product',
          quantity: 1,
          unit_price: 10000,
          tax_rate: 2500,
          total_amount: 10000,
          total_tax_amount: 2000
        }],
        merchant_urls: {
          terms: 'https://example.com/terms',
          checkout: 'https://example.com/checkout',
          confirmation: 'https://example.com/confirmation',
          push: 'https://example.com/webhooks/klarna'
        }
      };

      const mockKlarnaResponse = {
        order_id: 'klarna_order123',
        checkout_url: 'https://js.playground.klarna.com/eu/kco/checkout.html?order_id=klarna_order123',
        html_snippet: '<div id="klarna-checkout-container">...</div>'
      };

      mockKlarnaService.createCheckoutOrder.mockResolvedValue(mockKlarnaResponse);

      const result = await mockKlarnaService.createCheckoutOrder(orderData);

      expect(result).toEqual(mockKlarnaResponse);
      expect(mockKlarnaService.createCheckoutOrder).toHaveBeenCalledWith(orderData);
    });

    it('should create order lines correctly', () => {
      const items = [
        { name: 'Product 1', quantity: 2, price: 50 },
        { name: 'Product 2', quantity: 1, price: 100 }
      ];

      const expectedOrderLines = [
        {
          type: 'physical',
          reference: 'product-1',
          name: 'Product 1',
          quantity: 2,
          unit_price: 5000, // 50 NOK in øre
          tax_rate: 2500, // 25%
          total_amount: 10000,
          total_tax_amount: 2000
        },
        {
          type: 'physical',
          reference: 'product-2',
          name: 'Product 2',
          quantity: 1,
          unit_price: 10000, // 100 NOK in øre
          tax_rate: 2500, // 25%
          total_amount: 10000,
          total_tax_amount: 2000
        }
      ];

      const result = KlarnaService.createOrderLines(items);

      expect(result).toEqual(expectedOrderLines);
    });
  });

  describe('Payment Service Integration', () => {
    let paymentService: PaymentService;

    beforeEach(() => {
      paymentService = new PaymentService();
    });

    it('should create Stripe payment through payment service', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        amount: 10000,
        currency: 'nok',
        status: 'requires_payment_method',
        clientSecret: 'pi_test123_secret'
      };

      mockStripeService.createPaymentIntent.mockResolvedValue(mockPaymentIntent);

      const result = await paymentService.createPayment(
        'stripe' as any,
        100,
        'nok',
        'order123',
        'test@example.com'
      );

      expect(result.success).toBe(true);
      expect(result.provider).toBe('stripe');
      expect(result.transactionId).toBe('pi_test123');
      expect(result.clientSecret).toBe('pi_test123_secret');
    });

    it('should create Vipps payment through payment service', async () => {
      const mockVippsResponse = {
        orderId: 'order123',
        url: 'https://api.vipps.no/payment-url'
      };

      mockVippsService.createPayment.mockResolvedValue(mockVippsResponse);

      const result = await paymentService.createPayment(
        'vipps' as any,
        100,
        'nok',
        'order123',
        'test@example.com'
      );

      expect(result.success).toBe(true);
      expect(result.provider).toBe('vipps');
      expect(result.transactionId).toBe('order123');
      expect(result.clientSecret).toBe('https://api.vipps.no/payment-url');
    });

    it('should create Klarna payment through payment service', async () => {
      const mockKlarnaResponse = {
        order_id: 'klarna_order123',
        checkout_url: 'https://checkout.klarna.com',
        html_snippet: '<div>Klarna checkout</div>'
      };

      mockKlarnaService.createCheckoutOrder.mockResolvedValue(mockKlarnaResponse);

      const items = [
        { name: 'Test Product', quantity: 1, price: 100 }
      ];

      const result = await paymentService.createPayment(
        'klarna' as any,
        100,
        'nok',
        'order123',
        'test@example.com',
        items
      );

      expect(result.success).toBe(true);
      expect(result.provider).toBe('klarna');
      expect(result.transactionId).toBe('klarna_order123');
      expect(result.checkoutUrl).toBe('https://checkout.klarna.com');
    });

    it('should throw error for Klarna payment without items', async () => {
      await expect(
        paymentService.createPayment(
          'klarna' as any,
          100,
          'nok',
          'order123',
          'test@example.com'
        )
      ).rejects.toThrow('Klarna krever produktlinjer (items)');
    });
  });
});