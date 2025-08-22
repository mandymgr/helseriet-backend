import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import app from '@/app';
import { prisma } from '../setup';
import { emailService } from '@/config/email';

// Mock email service to avoid sending real emails in tests
jest.mock('@/config/email', () => ({
  emailService: {
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    sendOrderConfirmationEmail: jest.fn().mockResolvedValue(undefined),
    verifyConnection: jest.fn().mockResolvedValue(true)
  }
}));

const mockEmailService = emailService as jest.Mocked<typeof emailService>;

describe('Email Service Integration', () => {
  let adminToken: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Clean up data
    await prisma.user.deleteMany();

    // Create admin user for testing admin endpoints
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@helseriet.no',
        password: '$2a$10$hashedpassword',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        isActive: true,
        isVerified: true
      }
    });

    // Create token for admin user (simplified for testing)
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'testadmin@example.com',
        password: 'adminpassword123',
        firstName: 'Test',
        lastName: 'Admin'
      });

    // Update user role to admin
    await prisma.user.update({
      where: { id: registerResponse.body.data.user.id },
      data: { role: 'ADMIN' }
    });

    adminToken = registerResponse.body.data.accessToken;
  });

  describe('Welcome Email on Registration', () => {
    it('should send welcome email when user registers', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'testpassword123',
        firstName: 'New',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      
      // Verify welcome email was called (with some delay for async operation)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(
        userData.email,
        userData.firstName
      );
    });

    it('should not fail registration if welcome email fails', async () => {
      // Mock email service to throw error
      mockEmailService.sendWelcomeEmail.mockRejectedValue(new Error('Email service down'));

      const userData = {
        email: 'newuser2@example.com',
        password: 'testpassword123',
        firstName: 'New',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalled();
    });
  });

  describe('Password Reset Email', () => {
    beforeEach(async () => {
      // Create test user
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: '$2a$10$hashedpassword',
          firstName: 'Test',
          lastName: 'User',
          role: 'CUSTOMER',
          isActive: true,
          isVerified: false
        }
      });
    });

    it('should send password reset email for existing user', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify password reset email was called
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String), // reset token
        'Test'
      );
    });

    it('should handle email service failure gracefully', async () => {
      // Mock email service to throw error
      mockEmailService.sendPasswordResetEmail.mockRejectedValue(new Error('SMTP server down'));

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();
    });
  });

  describe('Admin Email Endpoints', () => {
    describe('GET /api/email/test-connection', () => {
      it('should test email connection for admin users', async () => {
        const response = await request(app)
          .get('/api/email/test-connection')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.connected).toBe(true);
        expect(response.body.data.message).toBe('Email service is working');
        expect(mockEmailService.verifyConnection).toHaveBeenCalled();
      });

      it('should reject non-admin users', async () => {
        // Create regular user
        const userData = {
          email: 'regular@example.com',
          password: 'testpassword123',
          firstName: 'Regular',
          lastName: 'User'
        };

        const registerResponse = await request(app)
          .post('/api/auth/register')
          .send(userData);

        const userToken = registerResponse.body.data.accessToken;

        const response = await request(app)
          .get('/api/email/test-connection')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Ikke autoriseret');
      });

      it('should require authentication', async () => {
        await request(app)
          .get('/api/email/test-connection')
          .expect(401);
      });
    });

    describe('POST /api/email/send-test', () => {
      it('should send test email for admin users', async () => {
        const response = await request(app)
          .post('/api/email/send-test')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ email: 'test@example.com' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Test email sent successfully');
        expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(
          'test@example.com',
          'Test User'
        );
      });

      it('should reject request without email', async () => {
        const response = await request(app)
          .post('/api/email/send-test')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('E-post adresse er påkrevd');
      });

      it('should reject non-admin users', async () => {
        // Create regular user
        const userData = {
          email: 'regular2@example.com',
          password: 'testpassword123',
          firstName: 'Regular',
          lastName: 'User'
        };

        const registerResponse = await request(app)
          .post('/api/auth/register')
          .send(userData);

        const userToken = registerResponse.body.data.accessToken;

        const response = await request(app)
          .post('/api/email/send-test')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ email: 'test@example.com' })
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Email Service Connection Issues', () => {
    it('should handle email service connection failure', async () => {
      mockEmailService.verifyConnection.mockResolvedValue(false);

      const response = await request(app)
        .get('/api/email/test-connection')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.connected).toBe(false);
      expect(response.body.data.message).toBe('Email service connection failed');
    });

    it('should handle email service errors during test send', async () => {
      mockEmailService.sendWelcomeEmail.mockRejectedValue(new Error('SMTP Authentication failed'));

      const response = await request(app)
        .post('/api/email/send-test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'test@example.com' })
        .expect(500);

      // The error should be handled by the error middleware
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalled();
    });
  });
});