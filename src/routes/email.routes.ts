import { Router } from 'express';
import { emailService } from '@/config/email';
import { authenticate } from '@/middleware/auth';
import { AppError } from '@/middleware/errorHandler';
import { Request, Response, NextFunction } from 'express';
import { adminRateLimiter } from '@/middleware/rateLimiter';

const router = Router();

// Test email connection (admin only) with admin rate limiting
router.get('/test-connection', adminRateLimiter, authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    
    // Check if user is admin
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new AppError('Ikke autorisert', 403);
    }

    const isConnected = await emailService.verifyConnection();
    
    res.status(200).json({
      success: true,
      data: {
        connected: isConnected,
        message: isConnected ? 'Email service is working' : 'Email service connection failed'
      }
    });
  } catch (error) {
    next(error);
  }
});

// Send test email (admin only) with admin rate limiting
router.post('/send-test', adminRateLimiter, authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { email } = req.body;
    
    // Check if user is admin
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new AppError('Ikke autorisert', 403);
    }

    if (!email) {
      throw new AppError('E-post adresse er påkrevd', 400);
    }

    await emailService.sendWelcomeEmail(email, 'Test User');
    
    res.status(200).json({
      success: true,
      message: 'Test email sent successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;