import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { paymentController } from '@/controllers/payments';
import { vippsController } from '@/controllers/payments/vipps.controller';
import { klarnaController } from '@/controllers/payments/klarna.controller';

const router = Router();

// Protected routes - require authentication
router.post('/create-intent', authenticate, paymentController.createPaymentIntent);
router.get('/:paymentId/status', authenticate, paymentController.getPaymentStatus);
router.post('/:paymentId/confirm', authenticate, paymentController.confirmPayment);

// Webhook routes - no authentication required (verified by signature)
router.post('/webhooks/stripe', paymentController.handleStripeWebhook);
router.post('/webhooks/vipps', vippsController.handleWebhook);
router.post('/webhooks/klarna', klarnaController.handleWebhook);

// Vipps specific routes
router.get('/vipps/:orderId/status', authenticate, vippsController.getPaymentStatus);
router.post('/vipps/:orderId/capture', authenticate, vippsController.capturePayment);
router.post('/vipps/:orderId/cancel', authenticate, vippsController.cancelPayment);

// Klarna specific routes
router.get('/klarna/checkout/:orderId', authenticate, klarnaController.getCheckoutOrder);
router.post('/klarna/checkout/:orderId', authenticate, klarnaController.updateCheckoutOrder);
router.get('/klarna/:orderId/details', authenticate, klarnaController.getOrderDetails);
router.post('/klarna/:orderId/capture', authenticate, klarnaController.captureOrder);
router.post('/klarna/:orderId/cancel', authenticate, klarnaController.cancelOrder);
router.post('/klarna/:orderId/refund', authenticate, klarnaController.createRefund);

export default router;