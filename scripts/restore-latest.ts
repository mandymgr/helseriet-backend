import { backupService } from '../src/utils/backupService';

async function restoreFromLatestBackup() {
  try {
    console.log('🔍 Looking for latest backup...');
    
    const backups = await backupService.listBackups();
    if (backups.length === 0) {
      console.log('❌ No backups found! Please create a backup first.');
      process.exit(1);
    }
    
    console.log(`📋 Found ${backups.length} backups. Latest: ${backups[0]}`);
    
    // Ask for confirmation (in a real script you might want to add readline)
    console.log('⚠️  This will REPLACE all current database data with backup data!');
    console.log('🔄 Proceeding with restore...');
    
    await backupService.restoreLatest();
    
    console.log('✅ Database restored successfully from latest backup!');
  } catch (error) {
    console.error('❌ Restore failed:', error);
    process.exit(1);
  }
}

restoreFromLatestBackup();