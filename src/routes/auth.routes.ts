import { Router } from 'express';
import { authController } from '@/controllers/auth';
import { validateRequest } from '@/middleware/validation';
import { loginValidation, registerValidation, forgotPasswordValidation, resetPasswordValidation } from '@/validations/auth.validation';
import { authenticate } from '@/middleware/auth';

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
router.post('/forgot-password', validateRequest(forgotPasswordValidation), authController.forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', validateRequest(resetPasswordValidation), authController.resetPassword);

// Token management endpoints (require authentication)
// POST /api/auth/logout-all - Logout from all devices
router.post('/logout-all', authenticate, authController.logoutFromAllDevices);

// GET /api/auth/active-tokens - Get active refresh tokens
router.get('/active-tokens', authenticate, authController.getActiveTokens);

export default router;