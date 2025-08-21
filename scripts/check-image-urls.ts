import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkImageUrls() {
  console.log('🔍 Checking image URLs and sort order...');

  try {
    const products = await prisma.product.findMany({
      include: {
        images: {
          orderBy: { sortOrder: 'asc' }
        }
      },
      where: {
        name: {
          contains: 'SYNERGY'
        }
      }
    });

    for (const product of products) {
      console.log(`\n📦 ${product.name} (${product.images.length} images):`);
      product.images.forEach((img, index) => {
        console.log(`  ${index + 1}. [${img.sortOrder}] ${img.url}`);
        console.log(`      Alt text: ${img.altText || 'N/A'}`);
      });
    }
  } catch (error) {
    console.error('❌ Error checking image URLs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkImageUrls();