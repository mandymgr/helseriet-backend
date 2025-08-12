import { Router } from 'express';
import { categoryController } from '@/controllers/categories';
import { authenticate, authorize } from '@/middleware/auth';

const router = Router();

// Public routes
// GET /api/categories
router.get('/', categoryController.getCategories);

// GET /api/categories/:id
router.get('/:id', categoryController.getCategory);

// Protected routes (Admin only)
router.use(authenticate, authorize(['ADMIN', 'SUPER_ADMIN']));

// POST /api/categories
router.post('/', categoryController.createCategory);

// PUT /api/categories/:id
router.put('/:id', categoryController.updateCategory);

// DELETE /api/categories/:id
router.delete('/:id', categoryController.deleteCategory);

export default router;