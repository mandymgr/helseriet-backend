import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProducts() {
  console.log('🔍 Checking all products in database...');

  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    });

    console.log(`\n📊 Found ${products.length} products total:\n`);
    
    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} (SKU: ${product.sku})`);
    });

    // Check specifically for Budels
    const budelsProducts = products.filter(p => 
      p.name.toLowerCase().includes('budels') || 
      p.name.toLowerCase().includes('budel') ||
      p.sku.toLowerCase().includes('budels') ||
      p.sku.toLowerCase().includes('budel')
    );

    if (budelsProducts.length > 0) {
      console.log(`\n🍺 Found ${budelsProducts.length} Budels products:`);
      budelsProducts.forEach(product => {
        console.log(`  - ${product.name} (${product.sku})`);
      });
    } else {
      console.log('\n❌ No Budels products found in database');
    }

  } catch (error) {
    console.error('❌ Error checking products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts();