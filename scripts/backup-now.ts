import { backupService } from '../src/utils/backupService';

async function createManualBackup() {
  try {
    console.log('🔄 Creating manual backup...');
    const backupPath = await backupService.createBackup('manual_backup');
    console.log(`✅ Backup completed: ${backupPath}`);
    
    // List all available backups
    const backups = await backupService.listBackups();
    console.log(`\n📋 Available backups (${backups.length}):`);
    backups.slice(0, 5).forEach((backup, index) => {
      console.log(`  ${index + 1}. ${backup}`);
    });
    
    if (backups.length > 5) {
      console.log(`  ... and ${backups.length - 5} more`);
    }
  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }
}

createManualBackup();