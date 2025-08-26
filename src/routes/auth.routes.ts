import { Router } from 'express';
import { authController } from '@/controllers/auth';
import { validateRequest } from '@/middleware/validation';
import { loginValidation, registerValidation, forgotPasswordValidation, resetPasswordValidation } from '@/validations/auth.validation';
import { authenticate } from '@/middleware/auth';
import { 
  authRateLimiter, 
  strictAuthRateLimiter, 
  passwordResetRateLimiter, 
  registrationRateLimiter 
} from '@/middleware/rateLimiter';

const router = Router();

// POST /api/auth/register - Apply registration rate limiting
router.post('/register', registrationRateLimiter, validateRequest(registerValidation), authController.register);

// POST /api/auth/login - Apply auth rate limiting
router.post('/login', authRateLimiter, validateRequest(loginValidation), authController.login);

// POST /api/auth/logout - No rate limiting needed for logout
router.post('/logout', authController.logout);

// GET /api/auth/me - Get current user (requires authentication)
router.get('/me', authenticate, authController.getCurrentUser);

// POST /api/auth/refresh - Apply auth rate limiting
router.post('/refresh', authRateLimiter, authController.refreshToken);

// POST /api/auth/forgot-password - Apply password reset rate limiting
router.post('/forgot-password', passwordResetRateLimiter, validateRequest(forgotPasswordValidation), authController.forgotPassword);

// POST /api/auth/reset-password - Apply strict auth rate limiting
router.post('/reset-password', strictAuthRateLimiter, validateRequest(resetPasswordValidation), authController.resetPassword);

// Token management endpoints (require authentication)
// POST /api/auth/logout-all - Logout from all devices - Apply strict rate limiting
router.post('/logout-all', strictAuthRateLimiter, authenticate, authController.logoutFromAllDevices);

// GET /api/auth/active-tokens - Get active refresh tokens - Apply auth rate limiting
router.get('/active-tokens', authRateLimiter, authenticate, authController.getActiveTokens);

export default router;