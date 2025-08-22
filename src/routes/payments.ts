import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { paymentController } from '@/controllers/payments';
import { vippsController } from '@/controllers/payments/vipps.controller';
import { klarnaController } from '@/controllers/payments/klarna.controller';
import { paymentRateLimiter, apiRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

// Protected routes - require authentication and payment rate limiting
router.post('/create-intent', paymentRateLimiter, authenticate, paymentController.createPaymentIntent);
router.get('/:paymentId/status', apiRateLimiter, authenticate, paymentController.getPaymentStatus);
router.post('/:paymentId/confirm', paymentRateLimiter, authenticate, paymentController.confirmPayment);

// Webhook routes - no authentication required (verified by signature) but rate limited
router.post('/webhooks/stripe', apiRateLimiter, paymentController.handleStripeWebhook);
router.post('/webhooks/vipps', apiRateLimiter, vippsController.handleWebhook);
router.post('/webhooks/klarna', apiRateLimiter, klarnaController.handleWebhook);

// Vipps specific routes - apply rate limiting
router.get('/vipps/:orderId/status', apiRateLimiter, authenticate, vippsController.getPaymentStatus);
router.post('/vipps/:orderId/capture', paymentRateLimiter, authenticate, vippsController.capturePayment);
router.post('/vipps/:orderId/cancel', paymentRateLimiter, authenticate, vippsController.cancelPayment);

// Klarna specific routes - apply rate limiting
router.get('/klarna/checkout/:orderId', apiRateLimiter, authenticate, klarnaController.getCheckoutOrder);
router.post('/klarna/checkout/:orderId', paymentRateLimiter, authenticate, klarnaController.updateCheckoutOrder);
router.get('/klarna/:orderId/details', apiRateLimiter, authenticate, klarnaController.getOrderDetails);
router.post('/klarna/:orderId/capture', paymentRateLimiter, authenticate, klarnaController.captureOrder);
router.post('/klarna/:orderId/cancel', paymentRateLimiter, authenticate, klarnaController.cancelOrder);
router.post('/klarna/:orderId/refund', paymentRateLimiter, authenticate, klarnaController.createRefund);

export default router;