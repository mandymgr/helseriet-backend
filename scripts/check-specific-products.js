const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const SYNERGY_KIT_PATH = '/Users/mandymarigjervikrygg/Desktop/Helseriet mapper/alle filer helseriet/Synergy kit /';

async function checkSpecificProducts() {
  console.log('🔍 CHECKING WHEAT GRASS JUICE AND ZINC COMPLEX');
  console.log('=============================================');

  try {
    const productsToCheck = [
      'SYNERGY - Wheat Grass Juice Powder',
      'SYNERGY - Zinc Complex'
    ];

    for (const productName of productsToCheck) {
      const product = await prisma.product.findFirst({
        where: { name: productName },
        include: { 
          images: { orderBy: { sortOrder: 'asc' } }
        }
      });

      if (!product) {
        console.log(`❌ Product not found: ${productName}`);
        continue;
      }

      const productNameClean = product.name.replace('SYNERGY - ', '');
      console.log(`\\n📦 ${productNameClean}:`);
      
      // Check original folder
      const originalPath = path.join(SYNERGY_KIT_PATH, productNameClean);
      console.log(`📁 Folder: ${originalPath}`);
      console.log(`📁 Exists: ${fs.existsSync(originalPath)}`);
      
      if (fs.existsSync(originalPath)) {
        const allFiles = fs.readdirSync(originalPath);
        console.log(`📁 Files: ${allFiles.join(', ')}`);
        
        const imageFiles = allFiles.filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));
        console.log(`📸 Image files: ${imageFiles.length}`);
        imageFiles.forEach(file => console.log(`   - ${file}`));
      }
      
      // Check database images
      console.log(`\\n💾 Database images: ${product.images.length}`);
      product.images.forEach((img, i) => {
        const filename = img.url.split('/').pop();
        console.log(`   ${i + 1}. ${img.imageType} (sortOrder: ${img.sortOrder}) - ${filename} ${img.isPrimary ? '⭐' : ''}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSpecificProducts().catch(console.error);