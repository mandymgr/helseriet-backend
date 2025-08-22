// Global test setup
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { beforeAll, afterAll, beforeEach, jest } from '@jest/globals';

const prisma = new PrismaClient();

// Set test environment
process.env.NODE_ENV = 'test';

beforeAll(async () => {
  console.log('🧪 Setting up test environment...');
  
  // Ensure test database is migrated
  try {
    execSync('npx prisma db push --force-reset', { 
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL }
    });
    console.log('✅ Test database migrated');
  } catch (error) {
    console.error('❌ Failed to migrate test database:', error);
  }
  
  // Connect to database
  await prisma.$connect();
  console.log('✅ Test database connected');
});

afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  
  // Clean up test data (optional - db push --force-reset already clears data)
  try {
    await prisma.$executeRaw`TRUNCATE TABLE "users", "products", "categories", "orders", "payments" CASCADE`;
  } catch (error) {
    // Ignore cleanup errors in tests
  }
  
  await prisma.$disconnect();
  console.log('✅ Test database disconnected');
});

// Clear database between test suites
beforeEach(async () => {
  // Clean up data between tests to avoid conflicts
  try {
    await prisma.refreshToken.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.order.deleteMany();
    await prisma.user.deleteMany();
    // Keep categories and products for most tests
  } catch (error) {
    // Ignore cleanup errors
  }
});

// Mock console methods to reduce test noise
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Export for use in tests
export { prisma };