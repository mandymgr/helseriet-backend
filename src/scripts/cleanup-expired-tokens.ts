#!/usr/bin/env ts-node

/**
 * Cleanup script for expired refresh tokens
 * This script should be run periodically (e.g., daily via cron job)
 */

import { refreshTokenService } from '@/services/auth/refreshToken.service';
import { logger } from '@/utils/logger.simple';

async function cleanupExpiredTokens() {
  try {
    logger.info('Starting cleanup of expired refresh tokens...');
    
    const deletedCount = await refreshTokenService.cleanupExpiredTokens();
    
    logger.info(`Cleanup completed. Deleted ${deletedCount} expired tokens.`);
    
    process.exit(0);
  } catch (error) {
    logger.error('Error during token cleanup:', error);
    process.exit(1);
  }
}

// Run cleanup if script is executed directly
if (require.main === module) {
  cleanupExpiredTokens();
}

export { cleanupExpiredTokens };