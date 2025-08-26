import { Router, Request, Response } from 'express';
import { requireDeleteConfirmation, logDestructiveOperation } from '../middleware/deleteProtection';
import { backupService } from '../utils/backupService';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Create manual backup
router.post('/backup/create', async (req: Request, res: Response) => {
  try {
    const reason = req.body.reason || 'manual';
    const backupPath = await backupService.createBackup(reason);
    
    res.json({
      success: true,
      message: 'Backup created successfully',
      backupPath,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Backup creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create backup'
    });
  }
});

// List available backups
router.get('/backup/list', async (req: Request, res: Response) => {
  try {
    const backups = await backupService.listBackups();
    res.json({
      success: true,
      backups: backups.map(filename => ({
        filename,
        created: filename.match(/backup_(.+)_/)?.[1]?.replace(/-/g, ':') || 'unknown',
        reason: filename.split('_').pop()?.replace('.json', '') || 'unknown'
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to list backups'
    });
  }
});

// Protected bulk delete operations
router.delete('/products/bulk', 
  requireDeleteConfirmation('BULK_DELETE_PRODUCTS'),
  logDestructiveOperation('BULK_DELETE_PRODUCTS'),
  async (req: Request, res: Response) => {
    try {
      // Create backup before deletion
      await backupService.createBackup('before_bulk_delete_products');
      
      const { productIds } = req.body;
      
      if (!productIds || !Array.isArray(productIds)) {
        res.status(400).json({
          success: false,
          error: 'productIds array is required'
        });
        return;
      }
      
      // Delete product images first
      await prisma.productImage.deleteMany({
        where: { productId: { in: productIds } }
      });
      
      // Delete products
      const deleteResult = await prisma.product.deleteMany({
        where: { id: { in: productIds } }
      });
      
      res.json({
        success: true,
        message: `Deleted ${deleteResult.count} products`,
        deletedCount: deleteResult.count
      });
    } catch (error) {
      console.error('Bulk delete error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete products'
      });
    }
  }
);

// Protected clear all data operation
router.delete('/database/clear-all',
  requireDeleteConfirmation('CLEAR_ALL_DATABASE'),
  logDestructiveOperation('CLEAR_ALL_DATABASE'),
  async (req: Request, res: Response) => {
    try {
      // Create backup before clearing
      await backupService.createBackup('before_clear_all');
      
      // Clear in correct order (respecting foreign key constraints)
      await prisma.productImage.deleteMany({});
      await prisma.homepageConfig.deleteMany({});
      await prisma.product.deleteMany({});
      await prisma.category.deleteMany({});
      // Keep users for safety
      
      res.json({
        success: true,
        message: 'Database cleared successfully',
        note: 'Users were preserved for safety'
      });
    } catch (error) {
      console.error('Clear database error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear database'
      });
    }
  }
);

// Emergency restore from backup
router.post('/database/restore/:backupFilename',
  requireDeleteConfirmation('RESTORE_FROM_BACKUP'),
  logDestructiveOperation('RESTORE_FROM_BACKUP'),
  async (req: Request, res: Response) => {
    try {
      const { backupFilename } = req.params;
      const backupPath = `backups/${backupFilename}`;
      
      await backupService.restoreFromBackup(backupPath);
      
      res.json({
        success: true,
        message: 'Database restored successfully from backup'
      });
    } catch (error) {
      console.error('Restore error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to restore from backup'
      });
    }
  }
);

// Get database statistics
router.get('/database/stats', async (req: Request, res: Response) => {
  try {
    const [products, categories, images, users, configs] = await Promise.all([
      prisma.product.count(),
      prisma.category.count(),
      prisma.productImage.count(),
      prisma.user.count(),
      prisma.homepageConfig.count()
    ]);
    
    res.json({
      success: true,
      stats: {
        products,
        categories,
        images,
        users,
        homepageConfigs: configs,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get database stats'
    });
  }
});

export default router;