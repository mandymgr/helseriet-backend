import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AppError } from '@/middleware/errorHandler';

const prisma = new PrismaClient();

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenPayload {
  userId: string;
  email: string;
  role: string;
}

class RefreshTokenService {
  private readonly accessTokenExpiry = '15m'; // Short-lived access token
  private readonly refreshTokenExpiry = '7d'; // Long-lived refresh token

  /**
   * Generate both access token and refresh token for a user
   */
  async generateTokenPair(userId: string, email: string, role: string): Promise<TokenPair> {
    // Generate access token (short-lived)
    const accessToken = jwt.sign(
      { userId, email, role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: this.accessTokenExpiry }
    );

    // Generate refresh token (long-lived, random string)
    const refreshTokenString = this.generateSecureToken();
    
    // Calculate expiry date for refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    // Store refresh token in database
    await this.storeRefreshToken(userId, refreshTokenString, expiresAt);

    return {
      accessToken,
      refreshToken: refreshTokenString
    };
  }

  /**
   * Refresh access token using a valid refresh token
   */
  async refreshAccessToken(refreshTokenString: string): Promise<TokenPair> {
    // Find refresh token in database
    const refreshTokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshTokenString },
      include: { user: true }
    });

    if (!refreshTokenRecord) {
      throw new AppError('Ugyldig refresh token', 401);
    }

    // Check if refresh token has expired
    if (refreshTokenRecord.expiresAt < new Date()) {
      // Clean up expired token
      await this.revokeRefreshToken(refreshTokenString);
      throw new AppError('Refresh token er utløpt', 401);
    }

    // Check if user is still active
    if (!refreshTokenRecord.user.isActive) {
      await this.revokeRefreshToken(refreshTokenString);
      throw new AppError('Bruker er ikke aktiv', 401);
    }

    // Generate new token pair
    const tokenPair = await this.generateTokenPair(
      refreshTokenRecord.user.id,
      refreshTokenRecord.user.email,
      refreshTokenRecord.user.role
    );

    // Remove old refresh token
    await this.revokeRefreshToken(refreshTokenString);

    return tokenPair;
  }

  /**
   * Revoke a specific refresh token
   */
  async revokeRefreshToken(refreshTokenString: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshTokenString }
    });
  }

  /**
   * Revoke all refresh tokens for a user (logout from all devices)
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { userId }
    });
  }

  /**
   * Clean up expired refresh tokens (maintenance task)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    return result.count;
  }

  /**
   * Get all active refresh tokens for a user
   */
  async getUserActiveTokens(userId: string): Promise<Array<{
    id: string;
    createdAt: Date;
    expiresAt: Date;
  }>> {
    const tokens = await prisma.refreshToken.findMany({
      where: {
        userId,
        expiresAt: {
          gt: new Date()
        }
      },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return tokens;
  }

  /**
   * Validate access token and extract payload
   */
  validateAccessToken(accessToken: string): RefreshTokenPayload {
    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET || 'fallback-secret') as any;
      return {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Access token er utløpt', 401);
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Ugyldig access token', 401);
      }
      throw error;
    }
  }

  /**
   * Store refresh token in database
   */
  private async storeRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    // Clean up old tokens for this user if they have too many
    const existingTokenCount = await prisma.refreshToken.count({
      where: { userId }
    });

    // Limit to 5 active refresh tokens per user (5 devices)
    if (existingTokenCount >= 5) {
      const oldestTokens = await prisma.refreshToken.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        take: existingTokenCount - 4 // Keep 4, remove the rest
      });

      await prisma.refreshToken.deleteMany({
        where: {
          id: {
            in: oldestTokens.map(t => t.id)
          }
        }
      });
    }

    // Store new refresh token
    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt
      }
    });
  }

  /**
   * Generate a cryptographically secure random token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }
}

export const refreshTokenService = new RefreshTokenService();