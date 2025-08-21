import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSpecificProducts() {
  console.log('🔧 Fixing specific products with wrong images...');

  try {
    // Products that still show wrong images
    const productsToFix = [
      'SYNERGY - D3 + K2 Complex',
      'SYNERGY - Heart Protector' // Hjertebeskytter in English
    ];

    for (const productName of productsToFix) {
      const product = await prisma.product.findFirst({
        where: { name: { contains: productName.replace('SYNERGY - ', '').replace(' Complex', '').replace(' Protector', '') } },
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

    console.log('\n✅ Specific products fixed! Check the frontend to see if they now show correct images.');
  } catch (error) {
    console.error('❌ Error fixing specific products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSpecificProducts();