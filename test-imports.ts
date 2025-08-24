import dotenv from 'dotenv';
dotenv.config();

console.log('1. Testing basic imports...');

try {
  console.log('2. Testing express...');
  import('express').then(() => console.log('✅ Express OK'));
  
  console.log('3. Testing path imports...');
  import('@/utils/logger.simple').then(() => console.log('✅ Logger OK')).catch(e => console.error('❌ Logger error:', e));
  
  console.log('4. Testing database config...');
  import('@/config/database').then(() => console.log('✅ Database config OK')).catch(e => console.error('❌ Database config error:', e));
  
  console.log('5. Testing middleware...');
  import('@/middleware/errorHandler').then(() => console.log('✅ ErrorHandler OK')).catch(e => console.error('❌ ErrorHandler error:', e));
  
  console.log('6. Testing routes...');
  import('@/routes/auth.routes').then(() => console.log('✅ Auth routes OK')).catch(e => console.error('❌ Auth routes error:', e));
  
  setTimeout(() => {
    console.log('Test completed');
    process.exit(0);
  }, 2000);
  
} catch (error) {
  console.error('❌ Immediate error:', error);
  process.exit(1);
}