import { Router } from 'express';
import { userController } from '@/controllers/users';
import { authenticate } from '@/middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/users/profile
router.get('/profile', userController.getProfile);

// PUT /api/users/profile
router.put('/profile', userController.updateProfile);

// GET /api/users/addresses
router.get('/addresses', userController.getAddresses);

// POST /api/users/addresses
router.post('/addresses', userController.createAddress);

// PUT /api/users/addresses/:id
router.put('/addresses/:id', userController.updateAddress);

// DELETE /api/users/addresses/:id
router.delete('/addresses/:id', userController.deleteAddress);

export default router;