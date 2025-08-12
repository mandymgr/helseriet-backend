import { Router } from 'express';
import { cartController } from '@/controllers/cart';
import { authenticate } from '@/middleware/auth';

const router = Router();

// All routes require authentication
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