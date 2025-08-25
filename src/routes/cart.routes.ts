import { Router } from 'express';
import { cartController } from '@/controllers/cart';
import { authenticate } from '@/middleware/auth';
import { apiRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

// Apply rate limiting to all routes
router.use(apiRateLimiter);

// Session-based cart routes (no auth required)
router.get('/session', cartController.getSessionCart);
router.post('/session/items', cartController.addToSessionCart);
router.put('/session/items/:productId', cartController.updateSessionCartItem);
router.delete('/session/items/:productId', cartController.removeFromSessionCart);
router.delete('/session', cartController.clearSessionCart);

// Authenticated routes (user must be logged in)
router.use(authenticate);

// GET /api/cart
router.get('/', cartController.getCart);

// POST /api/cart/items
router.post('/items', cartController.addToCart);

// PUT /api/cart/items/:productId
router.put('/items/:productId', cartController.updateCartItem);

// DELETE /api/cart/items/:productId
router.delete('/items/:productId', cartController.removeFromCart);

// DELETE /api/cart
router.delete('/', cartController.clearCart);

export default router;