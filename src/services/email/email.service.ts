import crypto from 'crypto';
import prisma from '@/config/database';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

export interface PasswordResetToken {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  used: boolean;
}

class EmailService {
  private readonly resetTokenExpiry = 60 * 60 * 1000; // 1 hour in milliseconds

  /**
   * Generate a password reset token and store it in database
   */
  async generatePasswordResetToken(email: string): Promise<string> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.isActive) {
      // For security, don't reveal if email exists or not
      logger.info(`Password reset attempted for non-existent or inactive email: ${email}`);
      return 'token-sent'; // Return success message regardless
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.resetTokenExpiry);

    // Clean up any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id }
    });

    // Store reset token in database
    await prisma.passwordResetToken.create({
      data: {
        token: resetToken,
        userId: user.id,
        expiresAt,
        used: false
      }
    });

    // TODO: Send actual email here
    // For now, we'll log the token (remove in production)
    logger.info(`Password reset token for ${email}: ${resetToken}`);
    
    return resetToken;
  }

  /**
   * Validate password reset token
   */
  async validatePasswordResetToken(token: string): Promise<{ userId: string; email: string }> {
    const resetTokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!resetTokenRecord) {
      throw new AppError('Ugyldig reset-token', 400);
    }

    if (resetTokenRecord.used) {
      throw new AppError('Reset-token er allerede brukt', 400);
    }

    if (resetTokenRecord.expiresAt < new Date()) {
      // Clean up expired token
      await prisma.passwordResetToken.delete({
        where: { id: resetTokenRecord.id }
      });
      throw new AppError('Reset-token er utløpt', 400);
    }

    if (!resetTokenRecord.user.isActive) {
      throw new AppError('Bruker er ikke aktiv', 400);
    }

    return {
      userId: resetTokenRecord.user.id,
      email: resetTokenRecord.user.email
    };
  }

  /**
   * Mark password reset token as used
   */
  async markTokenAsUsed(token: string): Promise<void> {
    await prisma.passwordResetToken.updateMany({
      where: { token },
      data: { used: true }
    });
  }

  /**
   * Clean up expired password reset tokens
   */
  async cleanupExpiredResetTokens(): Promise<number> {
    const result = await prisma.passwordResetToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { used: true }
        ]
      }
    });

    return result.count;
  }

  /**
   * Send password reset email (placeholder for future implementation)
   */
  private async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    // TODO: Implement actual email sending with nodemailer or similar
    // This should include:
    // 1. Create HTML email template
    // 2. Include reset link with token
    // 3. Send via SMTP service (Gmail, SendGrid, etc.)
    
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    logger.info(`Would send password reset email to ${email} with URL: ${resetUrl}`);
    
    // Placeholder for email sending
    // await this.mailer.sendMail({
    //   to: email,
    //   subject: 'Tilbakestill passord - Helseriet',
    //   html: `
    //     <h1>Tilbakestill passord</h1>
    //     <p>Klikk på lenken under for å tilbakestille passordet ditt:</p>
    //     <a href="${resetUrl}">Tilbakestill passord</a>
    //     <p>Denne lenken utløper om 1 time.</p>
    //   `
    // });
  }
}

export const emailService = new EmailService();