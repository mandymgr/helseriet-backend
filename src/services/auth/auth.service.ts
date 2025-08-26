import { hashSync, compareSync } from 'bcryptjs';
import crypto from 'crypto';
import { BaseService } from '../base.service';
import { refreshTokenService } from './refreshToken.service';
import { emailService } from '../email/email.service';

interface RegisterUserData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface UserWithTokens {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}

class AuthService extends BaseService {
  /**
   * Register a new user
   */
  async register(userData: RegisterUserData): Promise<UserWithTokens> {
    const { email, password, firstName, lastName } = userData;

    // Validate input
    this.validateRequiredFields(userData, ['email', 'password']);

    if (password.length < 6) {
      throw this.createValidationError('Passordet må være minst 6 tegn', 'password');
    }

    return this.handleDatabaseOperation(async () => {
      // Check if user already exists
      const existingUser = await this.db.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw this.createConflictError('En bruker med denne e-postadressen eksisterer allerede', 'email');
      }

      // Hash password
      const hashedPassword = hashSync(password, 10);

      // Create user
      const user = await this.db.user.create({
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

      // Generate tokens
      const tokens = await refreshTokenService.generateTokenPair(
        user.id,
        user.email,
        user.role
      );

      // Send welcome email (non-blocking)
      this.sendWelcomeEmailAsync(user.email, user.firstName || undefined);

      return {
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      };
    }, 'Failed to register user');
  }

  /**
   * Login user with credentials
   */
  async login(credentials: LoginCredentials): Promise<UserWithTokens> {
    const { email, password } = credentials;

    // Validate input
    this.validateRequiredFields(credentials, ['email', 'password']);

    return this.handleDatabaseOperation(async () => {
      // Find user
      const user = await this.db.user.findUnique({
        where: { email }
      });

      if (!user || !user.isActive) {
        throw this.createUnauthorizedError('Ugyldig e-post eller passord');
      }

      // Check password
      const isPasswordValid = compareSync(password, user.password);
      if (!isPasswordValid) {
        throw this.createUnauthorizedError('Ugyldig e-post eller passord');
      }

      // Generate tokens
      const tokens = await refreshTokenService.generateTokenPair(
        user.id,
        user.email,
        user.role
      );

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      };
    }, 'Failed to login user');
  }

  /**
   * Logout user
   */
  async logout(refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await refreshTokenService.revokeRefreshToken(refreshToken);
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    if (!refreshToken) {
      throw this.createValidationError('Refresh token er påkrevd', 'refreshToken');
    }

    return refreshTokenService.refreshAccessToken(refreshToken);
  }

  /**
   * Initiate password reset process
   */
  async initiatePasswordReset(email: string): Promise<void> {
    if (!email) {
      throw this.createValidationError('E-post er påkrevd', 'email');
    }

    // Generate password reset token (service handles user validation)
    await emailService.generatePasswordResetToken(email);
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    this.validateRequiredFields({ token, newPassword }, ['token', 'newPassword']);

    if (newPassword.length < 6) {
      throw this.createValidationError('Passordet må være minst 6 tegn', 'newPassword');
    }

    return this.handleDatabaseOperation(async () => {
      // Validate reset token and get user info
      const { userId } = await emailService.validatePasswordResetToken(token);

      // Hash new password
      const hashedPassword = hashSync(newPassword, 10);

      // Update user password
      await this.db.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });

      // Mark token as used
      await emailService.markTokenAsUsed(token);

      // Revoke all existing refresh tokens for security
      await refreshTokenService.revokeAllUserTokens(userId);
    }, 'Failed to reset password');
  }

  /**
   * Logout from all devices
   */
  async logoutFromAllDevices(userId: string): Promise<void> {
    this.validateId(userId, 'User');
    
    await refreshTokenService.revokeAllUserTokens(userId);
  }

  /**
   * Get user's active tokens
   */
  async getUserActiveTokens(userId: string): Promise<Array<{ id: string; createdAt: Date; expiresAt: Date }>> {
    this.validateId(userId, 'User');

    const activeTokens = await refreshTokenService.getUserActiveTokens(userId);

    return activeTokens.map(token => ({
      id: token.id,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt
    }));
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }> {
    this.validateId(userId, 'User');

    return this.handleDatabaseOperation(async () => {
      const user = await this.db.user.findUnique({
        where: { id: userId },
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

      if (!user) {
        throw this.createNotFoundError('User');
      }

      if (!user.isActive) {
        throw this.createUnauthorizedError('Brukerkonto er deaktivert');
      }

      return user;
    }, 'Failed to get user by ID');
  }

  /**
   * Send welcome email asynchronously (non-blocking)
   */
  private async sendWelcomeEmailAsync(email: string, firstName?: string): Promise<void> {
    try {
      const { emailService: emailServiceConfig } = await import('@/config/email');
      await emailServiceConfig.sendWelcomeEmail(email, firstName);
    } catch (error) {
      // Log but don't fail registration if email fails
      console.error('Failed to send welcome email:', error);
    }
  }
}

export const authService = new AuthService();