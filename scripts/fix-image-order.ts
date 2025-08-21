import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixImageOrder() {
  console.log('🔧 Fixing image sort order to prioritize front images...');

  try {
    // Get all products with images
    const products = await prisma.product.findMany({
      include: {
        images: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    for (const product of products) {
      console.log(`Processing ${product.name}...`);
      
      // Sort images: front images (LP, PDP) first, then others
      const sortedImages = product.images.sort((a, b) => {
        const aIsFront = a.url.includes('LP.jpg') || a.url.includes('PDP.jpg');
        const bIsFront = b.url.includes('LP.jpg') || b.url.includes('PDP.jpg');
        
        if (aIsFront && !bIsFront) return -1;
        if (!aIsFront && bIsFront) return 1;
        return a.sortOrder - b.sortOrder;
      });

      // Update sortOrder for each image
      for (let i = 0; i < sortedImages.length; i++) {
        await prisma.productImage.update({
          where: { id: sortedImages[i].id },
          data: { sortOrder: i }
        });
      }
    }

    console.log('✅ Image sort order fixed successfully!');
  } catch (error) {
    console.error('❌ Error fixing image order:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixImageOrder();