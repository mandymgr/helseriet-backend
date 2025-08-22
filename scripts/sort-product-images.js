const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Define the correct order based on filename patterns
const getImageOrder = (url) => {
  const filename = url.toLowerCase();
  
  // Priority order: PDP (1), LP (2), RP (3), Facts (4), others (5+)
  if (filename.includes('pdp')) return 1;
  if (filename.includes('_lp') || filename.includes('lp.')) return 2;
  if (filename.includes('_rp') || filename.includes('rp.')) return 3;
  if (filename.includes('facts')) return 4;
  
  // For generic image names, keep current order
  if (filename.includes('image_1')) return 1;
  if (filename.includes('image_2')) return 2;
  if (filename.includes('image_3')) return 3;
  if (filename.includes('image_4')) return 4;
  
  // Default for any other images
  return 5;
};

// Determine image type based on order (using allowed Prisma enum values)
const getImageType = (order) => {
  switch (order) {
    case 1: return 'FRONT';       // PDP - Product Detail Page
    case 2: return 'SIDE';        // LP - Left Panel  
    case 3: return 'BACK';        // RP - Right Panel
    case 4: return 'INGREDIENTS'; // Facts - Supplement Facts
    default: return 'GENERAL';
  }
};

async function sortAllProductImages() {
  console.log('🔄 SORTING ALL PRODUCT IMAGES');
  console.log('=============================');
  console.log('📋 Order: 1=PDP, 2=LP, 3=RP, 4=Facts\n');

  try {
    // Get all products with images
    const products = await prisma.product.findMany({
      include: { 
        images: { orderBy: { sortOrder: 'asc' } }
      },
      where: {
        images: { some: {} }
      }
    });

    let totalUpdated = 0;
    let productsUpdated = 0;

    for (const product of products) {
      console.log(`📦 Processing: ${product.name.replace('SYNERGY - ', '')}`);
      
      if (product.images.length === 0) {
        console.log('   ⚠️  No images found, skipping...\n');
        continue;
      }

      // Sort images by priority
      const sortedImages = product.images
        .map(img => ({
          ...img,
          priority: getImageOrder(img.url)
        }))
        .sort((a, b) => a.priority - b.priority);

      // Check if reordering is needed
      const needsReordering = sortedImages.some((img, index) => 
        img.sortOrder !== index || 
        img.imageType !== getImageType(index + 1) ||
        img.isPrimary !== (index === 0)
      );

      if (!needsReordering) {
        console.log('   ✅ Already correctly sorted\n');
        continue;
      }

      console.log('   🔄 Reordering images...');
      
      // Update each image with new order and type
      for (let i = 0; i < sortedImages.length; i++) {
        const image = sortedImages[i];
        const newOrder = i;
        const newType = getImageType(i + 1);
        const newPrimary = i === 0;

        await prisma.productImage.update({
          where: { id: image.id },
          data: {
            sortOrder: newOrder,
            imageType: newType,
            isPrimary: newPrimary,
            altText: `${product.name} - ${newType === 'FRONT' ? 'Product Image' : 
                      newType === 'SIDE' ? 'Left Panel' :
                      newType === 'BACK' ? 'Right Panel' :
                      newType === 'INGREDIENTS' ? 'Facts Panel' : `Image ${i + 1}`}`
          }
        });

        const filename = image.url.split('/').pop().split('.')[0];
        console.log(`      ${i + 1}. ${filename} → ${newType} (${image.priority === i + 1 ? '✅' : '🔄'})`);
        totalUpdated++;
      }

      productsUpdated++;
      console.log('   ✅ Sorting complete\n');
    }

    // Verify final state
    console.log('🎉 IMAGE SORTING COMPLETE!');
    console.log('==========================');
    console.log(`📦 Products processed: ${products.length}`);
    console.log(`🔄 Products updated: ${productsUpdated}`);
    console.log(`📸 Images reordered: ${totalUpdated}`);
    console.log('');

    // Show sample of correctly ordered products
    console.log('📋 SAMPLE OF CORRECTLY ORDERED PRODUCTS:');
    const sampleProducts = await prisma.product.findMany({
      include: { 
        images: { 
          orderBy: { sortOrder: 'asc' },
          take: 4
        }
      },
      where: {
        images: { some: {} }
      },
      take: 3
    });

    sampleProducts.forEach((product, i) => {
      console.log(`\n${i + 1}. ${product.name.replace('SYNERGY - ', '')}`);
      product.images.forEach((img, j) => {
        const filename = img.url.split('/').pop().split('.')[0];
        console.log(`   ${j + 1}. ${img.imageType} - ${filename} ${img.isPrimary ? '⭐' : ''}`);
      });
    });

  } catch (error) {
    console.error('❌ Error sorting images:', error);
  } finally {
    await prisma.$disconnect();
  }
}

sortAllProductImages().catch(console.error);