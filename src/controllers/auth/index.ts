import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/middleware/errorHandler';
import { authService } from '@/services/auth/auth.service';

class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      const result = await authService.register({ email, password, firstName, lastName });

      res.status(201).json({
        success: true,
        message: 'Bruker opprettet',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      
      const result = await authService.login({ email, password });

      res.status(200).json({
        success: true,
        message: 'Innlogging vellykket',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      
      await authService.logout(refreshToken);

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
      
      const newTokens = await authService.refreshAccessToken(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Tokens fornyet',
        data: newTokens
      });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      
      await authService.initiatePasswordReset(email);

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
      
      await authService.resetPassword(token, newPassword);

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

      await authService.logoutFromAllDevices(userId);

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

      const activeTokens = await authService.getUserActiveTokens(userId);

      res.status(200).json({
        success: true,
        data: { activeTokens }
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();