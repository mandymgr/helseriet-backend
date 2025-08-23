const { PrismaClient } = require('@prisma/client');

async function browseProducts() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== HELSERIET PRODUCTS ===\n');
    
    const products = await prisma.product.findMany({
      take: 10,
      include: {
        category: true,
        images: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    products.forEach((product, i) => {
      console.log(`${i + 1}. ${product.name}`);
      console.log(`   Category: ${product.category.name}`);
      console.log(`   Price: ${product.price} NOK`);
      console.log(`   Images: ${product.images.length}`);
      console.log(`   Active: ${product.isActive ? 'Yes' : 'No'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

browseProducts();