import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '@/app';
import { prisma } from '../setup';
import { hashSync } from 'bcryptjs';

describe('Authentication API', () => {
  beforeEach(async () => {
    // Clean up users before each test
    await prisma.user.deleteMany();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'testpassword123',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Bruker opprettet');
      expect(response.body.data.user).toMatchObject({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: 'CUSTOMER'
      });
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      
      // Password should not be returned
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'testpassword123',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject registration with short password', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Passordet må være minst 6 tegn');
    });

    it('should reject registration with duplicate email', async () => {
      // Create a user first
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: hashSync('password123', 10),
          role: 'CUSTOMER',
          isActive: true,
          isVerified: false
        }
      });

      const userData = {
        email: 'test@example.com',
        password: 'testpassword123',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('En bruker med denne e-postadressen eksisterer allerede');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: hashSync('testpassword123', 10),
          firstName: 'Test',
          lastName: 'User',
          role: 'CUSTOMER',
          isActive: true,
          isVerified: false
        }
      });
    });

    it('should login successfully with correct credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'testpassword123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Innlogging vellykket');
      expect(response.body.data.user).toMatchObject({
        email: loginData.email,
        firstName: 'Test',
        lastName: 'User'
      });
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should reject login with incorrect password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Ugyldig e-post eller passord');
    });

    it('should reject login with non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'testpassword123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Ugyldig e-post eller passord');
    });

    it('should reject login for inactive user', async () => {
      // Create inactive user
      await prisma.user.create({
        data: {
          email: 'inactive@example.com',
          password: hashSync('testpassword123', 10),
          role: 'CUSTOMER',
          isActive: false,
          isVerified: false
        }
      });

      const loginData = {
        email: 'inactive@example.com',
        password: 'testpassword123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Ugyldig e-post eller passord');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Register a user to get refresh token
      const userData = {
        email: 'test@example.com',
        password: 'testpassword123',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      refreshToken = response.body.data.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Tokens fornyet');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      // Should get a new refresh token
      expect(response.body.data.refreshToken).not.toBe(refreshToken);
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Ugyldig refresh token');
    });

    it('should reject missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Refresh token er påkrevd');
    });
  });

  describe('POST /api/auth/logout', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Register a user to get refresh token
      const userData = {
        email: 'test@example.com',
        password: 'testpassword123',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      refreshToken = response.body.data.refreshToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Utlogging vellykket');

      // Verify token is revoked by trying to refresh
      await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });

    it('should handle logout without refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Utlogging vellykket');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    beforeEach(async () => {
      // Create a test user
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: hashSync('testpassword123', 10),
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
      expect(response.body.message).toContain('Hvis e-postadressen er registrert');
    });

    it('should return success even for non-existent email (security)', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Hvis e-postadressen er registrert');
    });

    it('should reject request without email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('E-post er påkrevd');
    });
  });
});