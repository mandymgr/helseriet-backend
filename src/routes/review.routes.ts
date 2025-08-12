import { Router } from 'express';
import { reviewController } from '@/controllers/reviews';
import { authenticate } from '@/middleware/auth';

const router = Router();

// GET /api/reviews/product/:productId
router.get('/product/:productId', reviewController.getProductReviews);

// Protected routes
router.use(authenticate);

// POST /api/reviews
router.post('/', reviewController.createReview);

// PUT /api/reviews/:id
router.put('/:id', reviewController.updateReview);

// DELETE /api/reviews/:id
router.delete('/:id', reviewController.deleteReview);

export default router;