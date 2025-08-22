import { backupService } from '../src/utils/backupService';

async function safeDeleteProducts() {
  try {
    console.log('🛡️  SAFE PRODUCT DELETION');
    console.log('This script will create a backup before deleting any products.');
    console.log('');
    
    // Define which products to delete (customize as needed)
    const productsToDelete = [
      'Test Product 1',
      'Test Product 2',
      // Add product names here
    ];
    
    if (productsToDelete.length === 0) {
      console.log('ℹ️  No products specified for deletion. Edit the script to specify products.');
      process.exit(0);
    }
    
    console.log(`📋 Products to delete: ${productsToDelete.length}`);
    productsToDelete.forEach((name, index) => {
      console.log(`  ${index + 1}. ${name}`);
    });
    
    console.log('');
    console.log('🔒 Creating automatic backup before deletion...');
    
    // Use the safe delete function that creates backup automatically
    const deletedCount = await backupService.safeDeleteProducts({
      name: {
        in: productsToDelete
      }
    }, 'manual_safe_delete');
    
    console.log('');
    console.log(`✅ Safely deleted ${deletedCount} products`);
    console.log('🔒 Backup was created automatically');
    console.log('💡 To restore, run: npm run script scripts/restore-latest.ts');
    
  } catch (error) {
    console.error('❌ Safe deletion failed:', error);
    process.exit(1);
  }
}

safeDeleteProducts();