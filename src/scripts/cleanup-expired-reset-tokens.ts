#!/usr/bin/env ts-node

/**
 * Cleanup script for expired password reset tokens
 * This script should be run periodically (e.g., daily via cron job)
 */

import { emailService } from '@/services/email/email.service';
import { logger } from '@/utils/logger.simple';

async function cleanupExpiredResetTokens() {
  try {
    logger.info('Starting cleanup of expired password reset tokens...');
    
    const deletedCount = await emailService.cleanupExpiredResetTokens();
    
    logger.info(`Cleanup completed. Deleted ${deletedCount} expired reset tokens.`);
    
    process.exit(0);
  } catch (error) {
    logger.error('Error during reset token cleanup:', error);
    process.exit(1);
  }
}

// Run cleanup if script is executed directly
if (require.main === module) {
  cleanupExpiredResetTokens();
}

export { cleanupExpiredResetTokens };