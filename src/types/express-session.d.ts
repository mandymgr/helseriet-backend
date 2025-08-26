import 'express-session';

declare module 'express-session' {
  interface SessionData {
    cart?: {
      items: Array<{
        id: string;
        productId: string;
        quantity: number;
      }>;
    };
  }
}