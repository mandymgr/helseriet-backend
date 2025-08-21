import axios, { AxiosInstance } from 'axios';
import { AppError } from '@/middleware/errorHandler';

interface KlarnaConfig {
  username: string;
  password: string;
  baseUrl: string;
}

interface KlarnaOrderRequest {
  purchase_country: string;
  purchase_currency: string;
  locale: string;
  order_amount: number;
  order_tax_amount: number;
  order_lines: KlarnaOrderLine[];
  merchant_urls: {
    terms: string;
    checkout: string;
    confirmation: string;
    push: string;
  };
  billing_address?: KlarnaAddress;
  shipping_address?: KlarnaAddress;
}

interface KlarnaOrderLine {
  type: 'physical' | 'discount' | 'shipping_fee' | 'sales_tax' | 'digital' | 'gift_card' | 'store_credit' | 'surcharge';
  reference: string;
  name: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  total_amount: number;
  total_tax_amount: number;
}

interface KlarnaAddress {
  given_name: string;
  family_name: string;
  email: string;
  title?: string;
  street_address: string;
  street_address2?: string;
  postal_code: string;
  city: string;
  region?: string;
  country: string;
  phone?: string;
}

interface KlarnaCheckoutResponse {
  order_id: string;
  status: string;
  purchase_country: string;
  purchase_currency: string;
  locale: string;
  order_amount: number;
  order_tax_amount: number;
  order_lines: KlarnaOrderLine[];
  html_snippet: string;
  merchant_urls: any;
  started_at: string;
  last_modified_at: string;
  expires_at: string;
}

interface KlarnaOrderDetails {
  order_id: string;
  status: 'checkout_incomplete' | 'checkout_complete' | 'created' | 'authorized' | 'captured' | 'cancelled' | 'expired';
  purchase_country: string;
  purchase_currency: string;
  locale: string;
  order_amount: number;
  order_tax_amount: number;
  order_lines: KlarnaOrderLine[];
  billing_address?: KlarnaAddress;
  shipping_address?: KlarnaAddress;
  customer: {
    date_of_birth?: string;
    gender?: string;
  };
}

class KlarnaService {
  private client: AxiosInstance;
  private config: KlarnaConfig;

  constructor() {
    this.config = {
      username: process.env.KLARNA_USERNAME || '',
      password: process.env.KLARNA_PASSWORD || '',
      baseUrl: process.env.KLARNA_BASE_URL || 'https://api.playground.klarna.com'
    };

    if (!this.config.username || !this.config.password) {
      throw new Error('Klarna-konfigurasjon er ufullstendig. Sjekk environment variabler.');
    }

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`
      }
    });
  }

  // Create a Klarna Checkout session
  async createCheckoutOrder(orderRequest: KlarnaOrderRequest): Promise<KlarnaCheckoutResponse> {
    try {
      const response = await this.client.post('/checkout/v3/orders', orderRequest);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error_messages || error.response?.data?.message || error.message;
      throw new AppError(`Klarna checkout feil: ${JSON.stringify(errorMessage)}`, 500);
    }
  }

  // Retrieve an existing checkout order
  async getCheckoutOrder(orderId: string): Promise<KlarnaCheckoutResponse> {
    try {
      const response = await this.client.get(`/checkout/v3/orders/${orderId}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error_messages || error.response?.data?.message || error.message;
      throw new AppError(`Klarna hent ordre feil: ${JSON.stringify(errorMessage)}`, 500);
    }
  }

  // Update an existing checkout order
  async updateCheckoutOrder(orderId: string, orderRequest: Partial<KlarnaOrderRequest>): Promise<KlarnaCheckoutResponse> {
    try {
      const response = await this.client.post(`/checkout/v3/orders/${orderId}`, orderRequest);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error_messages || error.response?.data?.message || error.message;
      throw new AppError(`Klarna oppdater ordre feil: ${JSON.stringify(errorMessage)}`, 500);
    }
  }

  // Get order details from Order Management API
  async getOrderDetails(orderId: string): Promise<KlarnaOrderDetails> {
    try {
      const response = await this.client.get(`/ordermanagement/v1/orders/${orderId}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error_messages || error.response?.data?.message || error.message;
      throw new AppError(`Klarna ordre detaljer feil: ${JSON.stringify(errorMessage)}`, 500);
    }
  }

  // Acknowledge an order (required after checkout completion)
  async acknowledgeOrder(orderId: string): Promise<void> {
    try {
      await this.client.post(`/ordermanagement/v1/orders/${orderId}/acknowledge`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error_messages || error.response?.data?.message || error.message;
      throw new AppError(`Klarna bekreft ordre feil: ${JSON.stringify(errorMessage)}`, 500);
    }
  }

  // Capture an authorized order
  async captureOrder(orderId: string, captureData: {
    captured_amount: number;
    description: string;
    order_lines?: KlarnaOrderLine[];
  }): Promise<any> {
    try {
      const response = await this.client.post(`/ordermanagement/v1/orders/${orderId}/captures`, captureData);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error_messages || error.response?.data?.message || error.message;
      throw new AppError(`Klarna capture feil: ${JSON.stringify(errorMessage)}`, 500);
    }
  }

  // Cancel an authorized order
  async cancelOrder(orderId: string): Promise<void> {
    try {
      await this.client.post(`/ordermanagement/v1/orders/${orderId}/cancel`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error_messages || error.response?.data?.message || error.message;
      throw new AppError(`Klarna kanseller ordre feil: ${JSON.stringify(errorMessage)}`, 500);
    }
  }

  // Create refund for a captured order
  async createRefund(orderId: string, refundData: {
    refunded_amount: number;
    description: string;
    order_lines?: KlarnaOrderLine[];
  }): Promise<any> {
    try {
      const response = await this.client.post(`/ordermanagement/v1/orders/${orderId}/refunds`, refundData);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error_messages || error.response?.data?.message || error.message;
      throw new AppError(`Klarna refund feil: ${JSON.stringify(errorMessage)}`, 500);
    }
  }

  // Helper method to convert our product data to Klarna order lines
  static createOrderLines(items: Array<{
    name: string;
    quantity: number;
    price: number;
    taxRate?: number;
    reference?: string;
  }>): KlarnaOrderLine[] {
    return items.map(item => {
      const taxRate = item.taxRate || 2500; // 25% default Norwegian tax rate
      const unitPrice = Math.round(item.price * 100); // Convert to øre
      const totalAmount = unitPrice * item.quantity;
      const totalTaxAmount = Math.round(totalAmount * (taxRate / 10000));

      return {
        type: 'physical',
        reference: item.reference || item.name.toLowerCase().replace(/\s+/g, '-'),
        name: item.name,
        quantity: item.quantity,
        unit_price: unitPrice,
        tax_rate: taxRate,
        total_amount: totalAmount,
        total_tax_amount: totalTaxAmount
      };
    });
  }

  // Helper method to create shipping line
  static createShippingLine(shippingCost: number): KlarnaOrderLine {
    const unitPrice = Math.round(shippingCost * 100); // Convert to øre
    const taxRate = 2500; // 25% Norwegian tax rate
    const totalTaxAmount = Math.round(unitPrice * (taxRate / 10000));

    return {
      type: 'shipping_fee',
      reference: 'shipping',
      name: 'Frakt',
      quantity: 1,
      unit_price: unitPrice,
      tax_rate: taxRate,
      total_amount: unitPrice,
      total_tax_amount: totalTaxAmount
    };
  }

  // Helper method to convert Klarna status to our standard format
  getStandardStatus(klarnaStatus: string): string {
    switch (klarnaStatus) {
      case 'checkout_incomplete':
        return 'pending';
      case 'checkout_complete':
      case 'authorized':
        return 'authorized';
      case 'captured':
        return 'completed';
      case 'cancelled':
        return 'cancelled';
      case 'expired':
        return 'expired';
      default:
        return 'unknown';
    }
  }
}

export const klarnaService = new KlarnaService();

// Helper functions that can be used externally
export const createKlarnaOrderLines = KlarnaService.createOrderLines;
export const createKlarnaShippingLine = KlarnaService.createShippingLine;

export { KlarnaService, KlarnaOrderRequest, KlarnaOrderLine, KlarnaAddress, KlarnaCheckoutResponse, KlarnaOrderDetails };