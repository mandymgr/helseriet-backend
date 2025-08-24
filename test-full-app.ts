import dotenv from 'dotenv';
dotenv.config();

console.log('Testing app.ts import...');

try {
  console.log('1. Importing app...');
  import('./src/app').then((appModule) => {
    console.log('✅ App imported successfully');
    console.log('2. App type:', typeof appModule.default);
    
    // Test creating server without starting
    const app = appModule.default;
    console.log('✅ App instance created');
    
    process.exit(0);
  }).catch(error => {
    console.error('❌ App import failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  });
  
} catch (error) {
  console.error('❌ Immediate error:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
}