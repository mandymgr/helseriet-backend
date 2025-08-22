import { Router } from 'express';
import { cartController } from '@/controllers/cart';
import { authenticate } from '@/middleware/auth';
import { apiRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

// All routes require authentication and API rate limiting
router.use(authenticate, apiRateLimiter);

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