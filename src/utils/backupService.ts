import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface BackupData {
  timestamp: string;
  version: string;
  products: any[];
  categories: any[];
  images: any[];
  users: any[];
  homepageConfigs: any[];
}

export class BackupService {
  private readonly backupDir: string = path.join(process.cwd(), 'backups');

  constructor() {
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createAutomaticBackup(operation: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = await this.createBackup(`auto_${operation}_${timestamp}`);
    console.log(`🔒 Automatic backup created before ${operation}: ${path.basename(backupPath)}`);
    return backupPath;
  }

  async createBackup(reason: string = 'manual'): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `backup_${timestamp}_${reason}.json`;
      const backupPath = path.join(this.backupDir, backupFileName);

      console.log('📦 Creating database backup...');

      // Fetch all data
      const [products, categories, images, users, homepageConfigs] = await Promise.all([
        prisma.product.findMany({
          include: {
            category: true,
            images: true
          }
        }),
        prisma.category.findMany({
          include: {
            products: true
          }
        }),
        prisma.productImage.findMany(),
        prisma.user.findMany({
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            isVerified: true,
            createdAt: true,
            updatedAt: true
            // Exclude password for security
          }
        }),
        prisma.homepageConfig.findMany()
      ]);

      const backupData: BackupData = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        products,
        categories,
        images,
        users,
        homepageConfigs
      };

      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

      console.log(`✅ Backup created: ${backupFileName}`);
      console.log(`📊 Backup contains:`);
      console.log(`   Products: ${products.length}`);
      console.log(`   Categories: ${categories.length}`);
      console.log(`   Images: ${images.length}`);
      console.log(`   Users: ${users.length}`);
      console.log(`   Homepage Configs: ${homepageConfigs.length}`);

      // Clean up old backups (keep only last 10)
      await this.cleanupOldBackups();

      return backupPath;
    } catch (error) {
      console.error('❌ Error creating backup:', error);
      throw new Error('Failed to create backup');
    }
  }

  async restoreFromBackup(backupPath: string): Promise<void> {
    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }

      console.log('🔄 Restoring from backup...');
      const backupData: BackupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

      // Clear existing data (in reverse order of dependencies)
      await prisma.productImage.deleteMany({});
      await prisma.homepageConfig.deleteMany({});
      await prisma.product.deleteMany({});
      await prisma.category.deleteMany({});

      console.log('🧹 Cleared existing data');

      // Restore categories first
      for (const category of backupData.categories) {
        await prisma.category.create({
          data: {
            id: category.id,
            name: category.name,
            slug: category.slug,
            description: category.description,
            image: category.image,
            parentId: category.parentId,
            isActive: category.isActive,
            sortOrder: category.sortOrder,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt
          }
        });
      }

      // Restore products
      for (const product of backupData.products) {
        await prisma.product.create({
          data: {
            id: product.id,
            name: product.name,
            slug: product.slug,
            description: product.description,
            shortDescription: product.shortDescription,
            sku: product.sku,
            price: product.price,
            comparePrice: product.comparePrice,
            costPrice: product.costPrice,
            trackQuantity: product.trackQuantity,
            quantity: product.quantity,
            lowStockThreshold: product.lowStockThreshold,
            weight: product.weight,
            dimensions: product.dimensions,
            status: product.status,
            isActive: product.isActive,
            isFeatured: product.isFeatured,
            isBundle: product.isBundle,
            tags: product.tags,
            metaTitle: product.metaTitle,
            metaDescription: product.metaDescription,
            categoryId: product.categoryId,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt
          }
        });
      }

      // Restore product images
      for (const image of backupData.images) {
        await prisma.productImage.create({
          data: {
            id: image.id,
            productId: image.productId,
            url: image.url,
            altText: image.altText,
            sortOrder: image.sortOrder,
            imageType: image.imageType,
            isPrimary: image.isPrimary,
            originalFileName: image.originalFileName,
            createdAt: image.createdAt
          }
        });
      }

      // Restore homepage configs
      for (const config of backupData.homepageConfigs) {
        await prisma.homepageConfig.create({
          data: {
            id: config.id,
            isActive: config.isActive,
            featuredProductId: config.featuredProductId,
            bundleProducts: config.bundleProducts,
            popularProducts: config.popularProducts,
            categoriesConfig: config.categoriesConfig,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt,
            createdBy: config.createdBy,
            updatedBy: config.updatedBy
          }
        });
      }

      console.log('✅ Backup restored successfully');
    } catch (error) {
      console.error('❌ Error restoring backup:', error);
      throw new Error('Failed to restore backup');
    }
  }

  async listBackups(): Promise<string[]> {
    try {
      const files = fs.readdirSync(this.backupDir);
      return files.filter(file => file.startsWith('backup_') && file.endsWith('.json'))
                  .sort()
                  .reverse(); // Most recent first
    } catch (error) {
      console.error('Error listing backups:', error);
      return [];
    }
  }

  async getLatestBackup(): Promise<string | null> {
    try {
      const backups = await this.listBackups();
      const latestBackup = backups[0];
      return latestBackup ? path.join(this.backupDir, latestBackup) : null;
    } catch (error) {
      console.error('Error getting latest backup:', error);
      return null;
    }
  }

  async restoreLatest(): Promise<void> {
    const latestBackup = await this.getLatestBackup();
    if (!latestBackup) {
      throw new Error('No backups found to restore from');
    }
    console.log(`🔄 Restoring from latest backup: ${path.basename(latestBackup)}`);
    await this.restoreFromBackup(latestBackup);
  }

  async safeDeleteProducts(where: any, reason: string = 'manual_delete'): Promise<number> {
    // Create backup before deletion
    await this.createAutomaticBackup(`delete_products_${reason}`);
    
    // Perform deletion
    const result = await prisma.product.deleteMany({ where });
    console.log(`✅ Safely deleted ${result.count} products (backup created)`);
    
    return result.count;
  }

  async emergencyRestore(): Promise<void> {
    console.log('🚨 EMERGENCY RESTORE - Finding latest backup...');
    const backups = await this.listBackups();
    
    if (backups.length === 0) {
      throw new Error('❌ No backups available for emergency restore!');
    }

    const latestBackup = backups[0];
    if (!latestBackup) {
      throw new Error('❌ No valid backup found for emergency restore!');
    }
    console.log(`🔄 Emergency restoring from: ${latestBackup}`);
    
    await this.restoreFromBackup(path.join(this.backupDir, latestBackup));
    console.log('✅ Emergency restore completed!');
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.listBackups();
      if (backups.length > 15) { // Keep more backups for safety
        const toDelete = backups.slice(15);
        for (const backup of toDelete) {
          fs.unlinkSync(path.join(this.backupDir, backup));
          console.log(`🗑️  Deleted old backup: ${backup}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old backups:', error);
    }
  }
}

export const backupService = new BackupService();