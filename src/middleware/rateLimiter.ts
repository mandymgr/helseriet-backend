import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '@/config';
import { logger } from '@/utils/logger.simple';

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

const createRateLimiter = (rateLimitConfig: RateLimitConfig) => {
  return rateLimit({
    windowMs: rateLimitConfig.windowMs,
    max: rateLimitConfig.max,
    message: rateLimitConfig.message || {
      success: false,
      error: {
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(rateLimitConfig.windowMs / 1000)
      }
    },
    standardHeaders: rateLimitConfig.standardHeaders ?? true,
    legacyHeaders: rateLimitConfig.legacyHeaders ?? false,
    skipSuccessfulRequests: rateLimitConfig.skipSuccessfulRequests ?? false,
    skipFailedRequests: rateLimitConfig.skipFailedRequests ?? false,
    handler: (req: Request, res: Response) => {
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
      logger.warn(`Rate limit exceeded for IP: ${clientIp}, Path: ${req.path}`, {
        ip: clientIp,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent')
      });

      res.status(429).json({
        success: false,
        error: {
          message: rateLimitConfig.message || 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(rateLimitConfig.windowMs / 1000)
        }
      });
    }
  });
};

export const rateLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later.'
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 auth attempts per window
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
  skipSuccessfulRequests: true
});

export const strictAuthRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts for sensitive auth operations
  message: 'Too many sensitive authentication attempts. Please try again in 15 minutes.',
  skipSuccessfulRequests: true
});

export const passwordResetRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset requests per hour
  message: 'Too many password reset requests. Please try again in 1 hour.',
  skipFailedRequests: true
});

export const registrationRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 registration attempts per window
  message: 'Too many registration attempts. Please try again in 15 minutes.',
  skipFailedRequests: true
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 API requests per window
  message: 'Too many API requests. Please try again later.'
});

export const paymentRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 payment attempts per window
  message: 'Too many payment attempts. Please try again in 15 minutes.',
  skipFailedRequests: true
});

export const uploadRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 upload attempts per window
  message: 'Too many upload requests. Please try again later.'
});

export const searchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 search requests per minute
  message: 'Too many search requests. Please slow down.'
});

export const adminRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 admin requests per window
  message: 'Too many admin requests. Please try again later.'
});

export default {
  global: rateLimiter,
  auth: authRateLimiter,
  strictAuth: strictAuthRateLimiter,
  passwordReset: passwordResetRateLimiter,
  registration: registrationRateLimiter,
  api: apiRateLimiter,
  payment: paymentRateLimiter,
  upload: uploadRateLimiter,
  search: searchRateLimiter,
  admin: adminRateLimiter
};