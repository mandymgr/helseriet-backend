const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });
  
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Connected to database');
    
    // List all tables using raw query
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    console.log('\n📋 Tables in database:');
    tables.forEach(table => console.log(`- ${table.table_name}`));
    
    // Test if we can query products
    const productCount = await prisma.product.count();
    console.log(`\n📦 Products found: ${productCount}`);
    
    // Test sample query
    const sampleProduct = await prisma.product.findFirst();
    if (sampleProduct) {
      console.log(`\n🔍 Sample product: ${sampleProduct.name}`);
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();