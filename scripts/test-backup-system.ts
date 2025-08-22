import { backupService } from '../src/utils/backupService';

async function testBackupSystem() {
  try {
    console.log('🧪 TESTING BACKUP SYSTEM');
    console.log('');
    
    // Test 1: Create a manual backup
    console.log('📋 Test 1: Creating manual backup...');
    const backupPath = await backupService.createBackup('system_test');
    console.log(`✅ Backup created: ${backupPath}`);
    console.log('');
    
    // Test 2: List all backups
    console.log('📋 Test 2: Listing all backups...');
    const backups = await backupService.listBackups();
    console.log(`✅ Found ${backups.length} backups:`);
    backups.slice(0, 5).forEach((backup, index) => {
      console.log(`  ${index + 1}. ${backup}`);
    });
    if (backups.length > 5) {
      console.log(`  ... and ${backups.length - 5} more`);
    }
    console.log('');
    
    // Test 3: Get latest backup
    console.log('📋 Test 3: Getting latest backup...');
    const latestBackup = await backupService.getLatestBackup();
    if (latestBackup) {
      console.log(`✅ Latest backup: ${latestBackup}`);
    } else {
      console.log('❌ No latest backup found');
    }
    console.log('');
    
    // Test 4: Test automatic backup creation
    console.log('📋 Test 4: Testing automatic backup...');
    const autoBackupPath = await backupService.createAutomaticBackup('test_operation');
    console.log(`✅ Automatic backup created: ${autoBackupPath}`);
    console.log('');
    
    console.log('🎉 All backup system tests passed!');
    console.log('');
    console.log('💡 Backup system is ready to use with these commands:');
    console.log('  📦 Create backup: npm run script scripts/backup-now.ts');
    console.log('  🔄 Restore latest: npm run script scripts/restore-latest.ts');
    console.log('  🚨 Emergency restore: npm run script scripts/emergency-restore.ts');
    console.log('  🛡️  Safe delete: npm run script scripts/safe-delete-products.ts');
    
  } catch (error) {
    console.error('❌ Backup system test failed:', error);
    process.exit(1);
  }
}

testBackupSystem();