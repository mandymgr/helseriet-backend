import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/middleware/errorHandler';
import prisma from '@/config/database';
import { hashSync, compareSync } from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new AppError('En bruker med denne e-postadressen eksisterer allerede', 400);
      }

      // Hash password
      const hashedPassword = hashSync(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName: firstName || null,
          lastName: lastName || null,
          role: 'CUSTOMER',
          isActive: true,
          isVerified: false
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

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        message: 'Bruker opprettet',
        data: {
          user,
          token
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
      const user = await prisma.user.findUnique({
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

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      );

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;

      res.status(200).json({
        success: true,
        message: 'Innlogging vellykket',
        data: {
          user: userWithoutPassword,
          token
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      // For JWT tokens, logout is handled client-side by removing the token
      // In a production app, you might want to maintain a token blacklist
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
      // TODO: Implement refresh token logic
      res.status(200).json({
        success: true,
        message: 'Refresh token endpoint - to be implemented'
      });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      // TODO: Implement forgot password logic
      res.status(200).json({
        success: true,
        message: 'Forgot password endpoint - to be implemented'
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      // TODO: Implement reset password logic
      res.status(200).json({
        success: true,
        message: 'Reset password endpoint - to be implemented'
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();