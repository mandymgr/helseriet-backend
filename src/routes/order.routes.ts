import { Router } from 'express';
import { orderController } from '@/controllers/orders';
import { authenticate, authorize } from '@/middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/orders
router.get('/', orderController.getUserOrders);

// GET /api/orders/:id
router.get('/:id', orderController.getOrder);

// POST /api/orders
router.post('/', orderController.createOrder);

// PUT /api/orders/:id/cancel
router.put('/:id/cancel', orderController.cancelOrder);

// Admin routes
router.use(authorize(['ADMIN', 'SUPER_ADMIN']));

// GET /api/orders/admin/all
router.get('/admin/all', orderController.getAllOrders);

// PUT /api/orders/:id/status
router.put('/:id/status', orderController.updateOrderStatus);

export default router;