import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

console.log('Starting debug server...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

try {
  console.log('1. Importing app...');
  import('./src/app').then(async (appModule) => {
    console.log('✅ App imported');
    
    console.log('2. Importing database...');
    const { connectDatabase } = await import('./src/config/database');
    console.log('✅ Database module imported');
    
    console.log('3. Testing database connection...');
    await connectDatabase();
    console.log('✅ Database connected');
    
    console.log('4. Starting server...');
    const app = appModule.default;
    const PORT = process.env.PORT || 5000;
    
    const server = app.listen(PORT, () => {
      console.log('✅ Server started successfully on port', PORT);
      console.log('Health endpoint:', `http://localhost:${PORT}/health`);
      
      // Keep running for 5 seconds then exit
      setTimeout(() => {
        server.close(() => {
          console.log('✅ Server test completed successfully');
          process.exit(0);
        });
      }, 5000);
    });
    
  }).catch((error: any) => {
    console.error('❌ Error in app import/start:', error);
    console.error('Stack:', error?.stack);
    process.exit(1);
  });
  
} catch (error: any) {
  console.error('❌ Immediate error:', error);
  console.error('Stack:', error?.stack);
  process.exit(1);
}