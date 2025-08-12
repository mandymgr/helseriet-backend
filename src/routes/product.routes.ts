import { Router } from 'express';
import { productController } from '@/controllers/products';
import { authenticate, authorize } from '@/middleware/auth';
import uploadMiddleware, { processImages } from '@/middleware/upload';

const router = Router();

// Public routes
// GET /api/products
router.get('/', productController.getProducts);

// GET /api/products/:id
router.get('/:id', productController.getProduct);

// GET /api/products/search
router.get('/search', productController.searchProducts);

// Protected routes (Admin only)
router.use(authenticate, authorize(['ADMIN', 'SUPER_ADMIN']));

// POST /api/products
router.post('/', productController.createProduct);

// PUT /api/products/:id
router.put('/:id', productController.updateProduct);

// DELETE /api/products/:id
router.delete('/:id', productController.deleteProduct);

// POST /api/products/:id/images - Last opp produktbilder
router.post('/:id/images', 
  uploadMiddleware.array('images', 10), 
  processImages, 
  productController.uploadProductImages
);

// DELETE /api/products/:productId/images/:imageId - Slett produktbilde
router.delete('/:productId/images/:imageId', productController.deleteProductImage);

export default router;