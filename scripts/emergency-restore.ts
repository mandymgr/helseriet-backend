import { backupService } from '../src/utils/backupService';

async function emergencyRestore() {
  try {
    console.log('🚨 EMERGENCY DATABASE RESTORE');
    console.log('⚠️  This will replace ALL current database data!');
    console.log('');
    
    const backups = await backupService.listBackups();
    
    if (backups.length === 0) {
      console.log('❌ No backups found! Cannot perform emergency restore.');
      process.exit(1);
    }
    
    console.log(`📋 Found ${backups.length} available backups:`);
    backups.slice(0, 5).forEach((backup, index) => {
      console.log(`  ${index + 1}. ${backup}`);
    });
    
    console.log('');
    console.log('🔄 Proceeding with latest backup restore...');
    
    await backupService.emergencyRestore();
    
    console.log('');
    console.log('✅ Emergency restore completed successfully!');
    console.log('🔍 Please verify your data is restored correctly.');
    
  } catch (error) {
    console.error('❌ Emergency restore failed:', error);
    process.exit(1);
  }
}

emergencyRestore();