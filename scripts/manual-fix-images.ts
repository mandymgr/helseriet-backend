import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Manual mapping of which image should be first for each product
// Based on visual inspection - these are the image IDs/URLs that show the front of the product
const frontImageMappings: Record<string, string> = {
  // Eye Protector seems to be working correctly, but let's check all
  // We'll need to add the correct image IDs here after visual inspection
};

async function manualFixImages() {
  console.log('🔧 Manually fixing image order for products...');

  try {
    // First, let's identify which products need fixing by checking current first images
    const products = await prisma.product.findMany({
      include: {
        images: {
          orderBy: { sortOrder: 'asc' }
        }
      },
      where: {
        name: { contains: 'SYNERGY' }
      }
    });

    console.log('\n📋 Current first images (sortOrder 0):');
    for (const product of products) {
      if (product.images.length > 0) {
        const firstImage = product.images[0];
        if (firstImage) {
          console.log(`${product.name}: ${firstImage.id} - ${firstImage.url.split('/').pop()}`);
        }
      }
    }

    // For now, let's try a heuristic approach:
    // Often the first uploaded image (by timestamp in URL) might be the front image
    console.log('\n🔄 Attempting to fix based on upload timestamps...');
    
    for (const product of products) {
      if (product.images.length === 0) continue;
      
      // Sort images by the timestamp in the Cloudinary URL (v1755702xxx)
      const sortedByTimestamp = product.images.sort((a, b) => {
        const timestampA = a.url.match(/v(\d+)/)?.[1] || '0';
        const timestampB = b.url.match(/v(\d+)/)?.[1] || '0';
        return parseInt(timestampA) - parseInt(timestampB);
      });

      // Use the earliest uploaded image as the front image
      const frontImage = sortedByTimestamp[0];
      const currentFirstImage = product.images[0];
      
      if (!frontImage || !currentFirstImage) continue;
      
      console.log(`\n📦 Processing ${product.name}:`);
      console.log(`   Current first: ${currentFirstImage.url.split('/').pop()}`);
      console.log(`   New first: ${frontImage.url.split('/').pop()}`);
      
      if (frontImage.id !== currentFirstImage.id) {
        // Reorder images: front image gets sortOrder 0, others get incremental
        await prisma.productImage.update({
          where: { id: frontImage.id },
          data: { sortOrder: 0 }
        });

        // Update other images
        let sortOrder = 1;
        for (const img of product.images) {
          if (img.id !== frontImage.id) {
            await prisma.productImage.update({
              where: { id: img.id },
              data: { sortOrder: sortOrder++ }
            });
          }
        }
        
        console.log(`   ✅ Updated ${product.name}`);
      } else {
        console.log(`   ⏩ No change needed for ${product.name}`);
      }
    }

    console.log('\n✅ Manual image fix completed!');
  } catch (error) {
    console.error('❌ Error fixing images manually:', error);
  } finally {
    await prisma.$disconnect();
  }
}

manualFixImages();