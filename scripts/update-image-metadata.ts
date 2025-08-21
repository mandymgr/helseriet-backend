import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateImageMetadata() {
  console.log('🔧 Updating image metadata based on correct front images...');

  try {
    // Mapping of correct front images based on our testing
    const frontImageMappings: Record<string, string> = {
      'SYNERGY - Eye Protector': 'viblwthh6hkrrrfqbta4.jpg',
      'SYNERGY - D3 + K2 Complex': 'h7n666yhhdeizgnuvkar.jpg', 
      'SYNERGY - Heart Protector': 'q7xsjd4etxjf84fhqukj.jpg',
      'SYNERGY - Enzyme Power': 'bfgxjfhoddjtrqhtypjn.jpg',
      'SYNERGY - Matcha Power Kapsler': 'u3v8d8qj8mqxoccccaei.jpg',
      'SYNERGY - Immune Health': 'tuj45lkhaexsd4yfpcx8.jpg'
    };

    const products = await prisma.product.findMany({
      include: {
        images: { orderBy: { sortOrder: 'asc' } }
      },
      where: {
        name: { contains: 'SYNERGY' }
      }
    });

    for (const product of products) {
      if (product.images.length === 0) continue;

      console.log(`\n📦 Processing ${product.name}:`);
      
      const correctFrontImageFileName = frontImageMappings[product.name];
      
      for (const image of product.images) {
        const imageFileName = image.url.split('/').pop() || '';
        
        if (correctFrontImageFileName && imageFileName === correctFrontImageFileName) {
          // This is the correct front image
          await prisma.productImage.update({
            where: { id: image.id },
            data: {
              imageType: 'FRONT',
              isPrimary: true,
              sortOrder: 0
            }
          });
          console.log(`   ✅ Set as FRONT: ${imageFileName}`);
        } else {
          // This is not the front image
          await prisma.productImage.update({
            where: { id: image.id },
            data: {
              imageType: 'GENERAL',
              isPrimary: false
            }
          });
          console.log(`   📷 Set as GENERAL: ${imageFileName}`);
        }
      }

      // If no specific front image was mapped, use the current first image
      if (!correctFrontImageFileName && product.images.length > 0) {
        const firstImage = product.images[0];
        if (firstImage) {
          await prisma.productImage.update({
            where: { id: firstImage.id },
            data: {
              imageType: 'FRONT',
              isPrimary: true,
              sortOrder: 0
            }
          });
          console.log(`   ⚠️  Using current first as FRONT: ${firstImage.url.split('/').pop()}`);
        }
      }
    }

    console.log('\n✅ Image metadata updated successfully!');
  } catch (error) {
    console.error('❌ Error updating image metadata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateImageMetadata();