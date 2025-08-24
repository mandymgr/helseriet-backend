import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/middleware/errorHandler';
import prisma from '@/config/database';
import { hashSync, compareSync } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { refreshTokenService } from '@/services/auth/refreshToken.service';
import { emailService } from '@/services/email/email.service';

class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Validate input
      if (!email || !password) {
        throw new AppError('Email og passord er påkrevd', 400);
      }

      if (password.length < 6) {
        throw new AppError('Passordet må være minst 6 tegn', 400);
      }

      // Check if user already exists
      const existingUser = await prisma.users.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new AppError('En bruker med denne e-postadressen eksisterer allerede', 400);
      }

      // Hash password
      const hashedPassword = hashSync(password, 10);

      // Create user
      const user = await prisma.users.create({
        data: {
          id: crypto.randomUUID(),
          email,
          password: hashedPassword,
          firstName: firstName || null,
          lastName: lastName || null,
          role: 'CUSTOMER',
          isActive: true,
          isVerified: false,
          updatedAt: new Date()
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      });

      // Generate access token and refresh token
      const tokens = await refreshTokenService.generateTokenPair(
        user.id,
        user.email,
        user.role
      );

      // Send welcome email (non-blocking)
      try {
        const { emailService: emailServiceConfig } = await import('@/config/email');
        await emailServiceConfig.sendWelcomeEmail(user.email, user.firstName || undefined);
      } catch (emailError) {
        // Log but don't fail registration if email fails
        console.error('Failed to send welcome email:', emailError);
      }

      res.status(201).json({
        success: true,
        message: 'Bruker opprettet',
        data: {
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        throw new AppError('Email og passord er påkrevd', 400);
      }

      // Find user
      const user = await prisma.users.findUnique({
        where: { email }
      });

      if (!user || !user.isActive) {
        throw new AppError('Ugyldig e-post eller passord', 401);
      }

      // Check password
      const isPasswordValid = compareSync(password, user.password);
      if (!isPasswordValid) {
        throw new AppError('Ugyldig e-post eller passord', 401);
      }

      // Generate access token and refresh token
      const tokens = await refreshTokenService.generateTokenPair(
        user.id,
        user.email,
        user.role
      );

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;

      res.status(200).json({
        success: true,
        message: 'Innlogging vellykket',
        data: {
          user: userWithoutPassword,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        // Revoke the specific refresh token
        await refreshTokenService.revokeRefreshToken(refreshToken);
      }

      res.status(200).json({
        success: true,
        message: 'Utlogging vellykket'
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new AppError('Refresh token er påkrevd', 400);
      }

      // Generate new token pair using the refresh token
      const newTokens = await refreshTokenService.refreshAccessToken(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Tokens fornyet',
        data: {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      if (!email) {
        throw new AppError('E-post er påkrevd', 400);
      }

      // Generate password reset token (service handles user validation)
      await emailService.generatePasswordResetToken(email);

      // Always return success for security (don't reveal if email exists)
      res.status(200).json({
        success: true,
        message: 'Hvis e-postadressen er registrert, vil du motta en e-post med instruksjoner for å tilbakestille passordet'
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        throw new AppError('Token og nytt passord er påkrevd', 400);
      }

      if (newPassword.length < 6) {
        throw new AppError('Passordet må være minst 6 tegn', 400);
      }

      // Validate reset token and get user info
      const { userId } = await emailService.validatePasswordResetToken(token);

      // Hash new password
      const hashedPassword = hashSync(newPassword, 10);

      // Update user password
      await prisma.users.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });

      // Mark token as used
      await emailService.markTokenAsUsed(token);

      // Revoke all existing refresh tokens for security
      await refreshTokenService.revokeAllUserTokens(userId);

      res.status(200).json({
        success: true,
        message: 'Passordet er tilbakestilt. Du må logge inn på nytt.'
      });
    } catch (error) {
      next(error);
    }
  }

  // Additional token management endpoints
  async logoutFromAllDevices(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        throw new AppError('Bruker ikke funnet', 401);
      }

      // Revoke all refresh tokens for the user
      await refreshTokenService.revokeAllUserTokens(userId);

      res.status(200).json({
        success: true,
        message: 'Logget ut fra alle enheter'
      });
    } catch (error) {
      next(error);
    }
  }

  async getActiveTokens(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        throw new AppError('Bruker ikke funnet', 401);
      }

      const activeTokens = await refreshTokenService.getUserActiveTokens(userId);

      res.status(200).json({
        success: true,
        data: {
          activeTokens: activeTokens.map(token => ({
            id: token.id,
            createdAt: token.createdAt,
            expiresAt: token.expiresAt
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();