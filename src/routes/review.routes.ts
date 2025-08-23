import { Router } from 'express';
import { reviewController } from '@/controllers/reviews';
import { authenticate } from '@/middleware/auth';

const router = Router();

// Public routes
// GET /api/reviews/product/:productId - Get reviews for a product
router.get('/product/:productId', reviewController.getProductReviews);

// GET /api/reviews/product/:productId/stats - Get review statistics for a product
router.get('/product/:productId/stats', reviewController.getReviewStats);

// Protected routes (require authentication)
router.use(authenticate);

// GET /api/reviews/user - Get current user's reviews
router.get('/user', reviewController.getUserReviews);

// POST /api/reviews/product/:productId - Create a review for a product
router.post('/product/:productId', reviewController.createReview);

// PUT /api/reviews/:reviewId - Update a review
router.put('/:reviewId', reviewController.updateReview);

// DELETE /api/reviews/:reviewId - Delete a review
router.delete('/:reviewId', reviewController.deleteReview);

export default router;