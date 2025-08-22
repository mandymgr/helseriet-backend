import { Router } from 'express';
import { productController } from '@/controllers/products';
import { authenticate, authorize } from '@/middleware/auth';
import uploadMiddleware, { processImages } from '@/middleware/upload';
import { apiRateLimiter, searchRateLimiter, adminRateLimiter, uploadRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

// Public routes with appropriate rate limiting
// GET /api/products
router.get('/', apiRateLimiter, productController.getProducts);

// GET /api/products/:id
router.get('/:id', apiRateLimiter, productController.getProduct);

// GET /api/products/search - Apply search rate limiting
router.get('/search', searchRateLimiter, productController.searchProducts);

// GET /api/bundles - Get bundle products only
router.get('/bundles', apiRateLimiter, (req, res, next) => {
  // Add isBundle filter to query params
  req.query.isBundle = 'true';
  return productController.getProducts(req, res, next);
});

// Protected routes (Admin only) with admin rate limiting
router.use(authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), adminRateLimiter);

// POST /api/products
router.post('/', productController.createProduct);

// PUT /api/products/:id
router.put('/:id', productController.updateProduct);

// DELETE /api/products/:id
router.delete('/:id', productController.deleteProduct);

// POST /api/products/:id/images - Last opp produktbilder with upload rate limiting
router.post('/:id/images', 
  uploadRateLimiter,
  uploadMiddleware.array('images', 10), 
  processImages, 
  productController.uploadProductImages
);

// DELETE /api/products/:productId/images/:imageId - Slett produktbilde
router.delete('/:productId/images/:imageId', productController.deleteProductImage);

export default router;