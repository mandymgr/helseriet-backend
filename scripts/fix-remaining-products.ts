import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixRemainingProducts() {
  console.log('🔧 Fixing remaining products with wrong images...');

  try {
    // Products that still show wrong images
    const productsToFix = [
      'Enzyme Power',
      'Matcha Power Kapsler', 
      'Immune Health'
    ];

    for (const productName of productsToFix) {
      const product = await prisma.product.findFirst({
        where: { name: { contains: productName } },
        include: {
          images: { orderBy: { sortOrder: 'asc' } }
        }
      });

      if (!product || product.images.length <= 1) {
        console.log(`❌ Product not found or has insufficient images: ${productName}`);
        continue;
      }

      console.log(`\n📦 Processing ${product.name}:`);
      const currentFirst = product.images[0];
      const nextImage = product.images[1];
      
      if (!currentFirst || !nextImage) continue;

      console.log(`   Current first: ${currentFirst.url.split('/').pop()}`);
      console.log(`   New first: ${nextImage.url.split('/').pop()}`);
      
      // Swap the sort orders
      await prisma.productImage.update({
        where: { id: nextImage.id },
        data: { sortOrder: 0 }
      });
      
      await prisma.productImage.update({
        where: { id: currentFirst.id },
        data: { sortOrder: 1 }
      });
      
      console.log(`   ✅ Updated ${product.name}`);
    }

    console.log('\n✅ Remaining products fixed! Check the frontend to see if they now show correct images.');
  } catch (error) {
    console.error('❌ Error fixing remaining products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRemainingProducts();