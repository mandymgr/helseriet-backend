import { Router } from 'express';
import { paymentController } from '@/controllers/payments';
import { authenticate } from '@/middleware/auth';
import { apiRateLimiter, paymentRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

// Session-based payment routes (no authentication required)
router.post('/session/create-intent', paymentRateLimiter, paymentController.createSessionPaymentIntent);

// Authenticated user payment routes
router.post('/create-intent', paymentRateLimiter, authenticate, paymentController.createPaymentIntent);

// Payment confirmation (works for both session and authenticated)
router.post('/confirm', paymentRateLimiter, paymentController.confirmPayment);

// Payment status check
router.get('/:paymentIntentId/status', apiRateLimiter, paymentController.getPaymentStatus);

// Webhook route - no authentication required (verified by signature)
router.post('/webhook/stripe', paymentController.handleWebhook);

export default router;