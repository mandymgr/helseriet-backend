import { Router } from 'express';
import { authController } from '@/controllers/auth';
import { validateRequest } from '@/middleware/validation';
import { loginValidation, registerValidation } from '@/validations/auth.validation';

const router = Router();

// POST /api/auth/register
router.post('/register', validateRequest(registerValidation), authController.register);

// POST /api/auth/login
router.post('/login', validateRequest(loginValidation), authController.login);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// POST /api/auth/refresh
router.post('/refresh', authController.refreshToken);

// POST /api/auth/forgot-password
router.post('/forgot-password', authController.forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', authController.resetPassword);

export default router;