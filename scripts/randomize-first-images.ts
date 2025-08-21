import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function randomizeFirstImages() {
  console.log('🎲 Randomizing first images (except Eye Protector)...');

  try {
    const products = await prisma.product.findMany({
      include: {
        images: {
          orderBy: { sortOrder: 'asc' }
        }
      },
      where: {
        name: { 
          contains: 'SYNERGY',
          not: { contains: 'Eye Protector' } // Skip Eye Protector since it's working
        }
      }
    });

    for (const product of products) {
      if (product.images.length <= 1) continue;
      
      console.log(`\n📦 Processing ${product.name}:`);
      const currentFirst = product.images[0];
      if (!currentFirst) continue;
      
      console.log(`   Current first: ${currentFirst.url.split('/').pop()}`);
      
      // Pick a random image that's not already first
      const otherImages = product.images.slice(1);
      if (otherImages.length === 0) continue;
      
      const randomIndex = Math.floor(Math.random() * otherImages.length);
      const newFirstImage = otherImages[randomIndex];
      if (!newFirstImage) continue;
      
      console.log(`   New first: ${newFirstImage.url.split('/').pop()}`);
      
      // Set the new first image to sortOrder 0
      await prisma.productImage.update({
        where: { id: newFirstImage.id },
        data: { sortOrder: 0 }
      });
      
      // Set the old first image to the position of the new first image
      await prisma.productImage.update({
        where: { id: currentFirst.id },
        data: { sortOrder: newFirstImage.sortOrder }
      });
      
      console.log(`   ✅ Swapped images for ${product.name}`);
    }

    console.log('\n✅ Randomization completed! Please check the frontend and let me know which products now show the correct front images.');
  } catch (error) {
    console.error('❌ Error randomizing images:', error);
  } finally {
    await prisma.$disconnect();
  }
}

randomizeFirstImages();