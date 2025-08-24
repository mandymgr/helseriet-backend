require('dotenv').config();

try {
  console.log('1. Loading express...');
  const express = require('express');
  console.log('✅ Express loaded');
  
  console.log('2. Testing path resolution...');
  const tsConfig = require('tsconfig-paths');
  const tsConfigPaths = require('tsconfig-paths');
  console.log('✅ tsconfig-paths loaded');

  console.log('3. Testing app creation...');
  const app = express();
  console.log('✅ App created');

  console.log('4. Testing basic middleware...');
  app.use(express.json());
  console.log('✅ JSON middleware added');

  console.log('5. Testing health endpoint...');
  app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
  });
  console.log('✅ Health endpoint added');

  console.log('6. Starting server...');
  const server = app.listen(3002, () => {
    console.log('✅ Server started on port 3002');
    server.close(() => {
      console.log('✅ Test completed successfully');
      process.exit(0);
    });
  });

} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}