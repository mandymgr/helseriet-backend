import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger.simple';

declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

export async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info('Database connection established');
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
}

export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
}

export { PrismaClient };
export default prisma;