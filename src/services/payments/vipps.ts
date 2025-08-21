import axios, { AxiosInstance } from 'axios';
import { AppError } from '@/middleware/errorHandler';

interface VippsConfig {
  clientId: string;
  clientSecret: string;
  subscriptionKey: string;
  merchantSerialNumber: string;
  baseUrl: string;
}

interface VippsPaymentRequest {
  amount: number;
  currency: string;
  orderId: string;
  description: string;
  redirectUrl?: string;
  userFlow?: 'WEB_REDIRECT' | 'NATIVE_REDIRECT';
}

interface VippsPaymentResponse {
  orderId: string;
  url: string;
  token: string;
}

interface VippsPaymentStatus {
  orderId: string;
  transactionInfo: {
    status: 'INITIATED' | 'AUTHORIZED' | 'CANCELLED' | 'EXPIRED' | 'REJECTED';
    amount: number;
    transactionId: string;
    timeStamp: string;
  };
}

class VippsService {
  private client: AxiosInstance;
  private config: VippsConfig;
  private accessToken: string = '';
  private tokenExpiry: Date | null = null;

  constructor() {
    this.config = {
      clientId: process.env.VIPPS_CLIENT_ID || '',
      clientSecret: process.env.VIPPS_CLIENT_SECRET || '',
      subscriptionKey: process.env.VIPPS_SUBSCRIPTION_KEY || '',
      merchantSerialNumber: process.env.VIPPS_MERCHANT_SERIAL_NUMBER || '',
      baseUrl: process.env.VIPPS_BASE_URL || 'https://apitest.vipps.no' // Test environment
    };

    if (!this.config.clientId || !this.config.clientSecret || !this.config.subscriptionKey || !this.config.merchantSerialNumber) {
      throw new Error('Vipps-konfigurasjon er ufullstendig. Sjekk environment variabler.');
    }

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
        'Merchant-Serial-Number': this.config.merchantSerialNumber,
      }
    });
  }

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await this.client.post('/accesstoken/get', {}, {
        headers: {
          'client_id': this.config.clientId,
          'client_secret': this.config.clientSecret
        }
      });

      this.accessToken = response.data.access_token;
      // Vipps tokens typically expire in 3600 seconds, we'll refresh 5 minutes early
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 300) * 1000);
      
      if (!this.accessToken) {
        throw new AppError('Vipps: Mottok ikke gyldig access token', 500);
      }
      
      return this.accessToken;
    } catch (error: any) {
      throw new AppError(`Vipps autentiseringsfeil: ${error.response?.data?.message || error.message}`, 500);
    }
  }

  async createPayment(paymentRequest: VippsPaymentRequest): Promise<VippsPaymentResponse> {
    try {
      const accessToken = await this.getAccessToken();
      
      const vippsRequest = {
        amount: Math.round(paymentRequest.amount * 100), // Convert to øre
        currency: paymentRequest.currency.toUpperCase(),
        orderId: paymentRequest.orderId,
        description: paymentRequest.description,
        redirectUrl: paymentRequest.redirectUrl || `${process.env.FRONTEND_URL}/payment/success`,
        userFlow: paymentRequest.userFlow || 'WEB_REDIRECT'
      };

      const response = await this.client.post('/ecomm/v2/payments', vippsRequest, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Request-Id': this.generateRequestId(),
          'X-TimeStamp': new Date().toISOString(),
          'X-Source-Address': '127.0.0.1'
        }
      });

      return {
        orderId: response.data.orderId,
        url: response.data.url,
        token: response.data.token || ''
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      throw new AppError(`Vipps betalingsfeil: ${errorMessage}`, 500);
    }
  }

  async getPaymentStatus(orderId: string): Promise<VippsPaymentStatus> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await this.client.get(`/ecomm/v2/payments/${orderId}/details`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Request-Id': this.generateRequestId(),
          'X-TimeStamp': new Date().toISOString()
        }
      });

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      throw new AppError(`Vipps statusfeil: ${errorMessage}`, 500);
    }
  }

  async capturePayment(orderId: string, amount: number, description: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();

      const captureRequest = {
        merchantInfo: {
          merchantSerialNumber: this.config.merchantSerialNumber
        },
        transaction: {
          amount: Math.round(amount * 100), // Convert to øre
          transactionText: description
        }
      };

      const response = await this.client.post(`/ecomm/v2/payments/${orderId}/capture`, captureRequest, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Request-Id': this.generateRequestId(),
          'X-TimeStamp': new Date().toISOString()
        }
      });

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      throw new AppError(`Vipps capture-feil: ${errorMessage}`, 500);
    }
  }

  async cancelPayment(orderId: string, description: string = 'Ordre kansellert'): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();

      const cancelRequest = {
        merchantInfo: {
          merchantSerialNumber: this.config.merchantSerialNumber
        },
        transaction: {
          transactionText: description
        }
      };

      const response = await this.client.put(`/ecomm/v2/payments/${orderId}/cancel`, cancelRequest, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Request-Id': this.generateRequestId(),
          'X-TimeStamp': new Date().toISOString()
        }
      });

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      throw new AppError(`Vipps kanselleringsfeil: ${errorMessage}`, 500);
    }
  }

  private generateRequestId(): string {
    return `helseriet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Helper method to convert Vipps status to our standard format
  getStandardStatus(vippsStatus: string): string {
    switch (vippsStatus) {
      case 'INITIATED':
        return 'pending';
      case 'AUTHORIZED':
        return 'authorized';
      case 'CANCELLED':
        return 'cancelled';
      case 'EXPIRED':
        return 'expired';
      case 'REJECTED':
        return 'failed';
      default:
        return 'unknown';
    }
  }
}

export const vippsService = new VippsService();