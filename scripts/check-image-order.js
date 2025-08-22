const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const SYNERGY_KIT_PATH = '/Users/mandymarigjervikrygg/Desktop/Helseriet mapper/alle filer helseriet/Synergy kit /';

// Define correct order based on original filename patterns
const getCorrectImageOrder = (originalPath) => {
  const filename = path.basename(originalPath).toLowerCase();
  
  // Priority order: PDP (0), LP (1), RP (2), Facts (3)
  if (filename.includes('pdp')) return 0;
  if (filename.includes('_lp') || filename === 'lp.jpg') return 1;
  if (filename.includes('_rp') || filename === 'rp.jpg') return 2;
  if (filename.includes('facts') || filename.includes('fact')) return 3;
  
  return 99;
};

async function checkImageOrder() {
  console.log('🔍 CHECKING IMAGE ORDER FOR ALL SYNERGY PRODUCTS');
  console.log('================================================');

  try {
    // Get all SYNERGY products
    const products = await prisma.product.findMany({
      where: { 
        name: { startsWith: 'SYNERGY - ' }
      },
      include: { 
        images: { orderBy: { sortOrder: 'asc' } }
      }
    });

    console.log(`📦 Checking ${products.length} SYNERGY products\\n`);

    let correctCount = 0;
    let incorrectCount = 0;

    for (const product of products) {
      const productNameClean = product.name.replace('SYNERGY - ', '');
      
      // Get original images from file system
      const originalPath = path.join(SYNERGY_KIT_PATH, productNameClean);
      
      if (!fs.existsSync(originalPath)) {
        console.log(`❌ ${productNameClean} - Original folder not found`);
        continue;
      }

      const allFiles = fs.readdirSync(originalPath);
      const originalFiles = allFiles
        .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file))
        .map(file => ({
          filename: file,
          correctOrder: getCorrectImageOrder(file)
        }))
        .filter(file => file.correctOrder < 99)
        .sort((a, b) => a.correctOrder - b.correctOrder);

      if (originalFiles.length === 0) {
        continue;
      }

      // Check if database order matches expected order
      let isCorrect = true;
      let errorDetails = [];

      // Expected order: PDP(0) → LP(1) → RP(2) → Facts(3)
      const expectedTypes = ['FRONT', 'SIDE', 'BACK', 'INGREDIENTS'];
      
      for (let i = 0; i < Math.min(4, product.images.length); i++) {
        const dbImage = product.images[i];
        const expectedType = expectedTypes[i];
        
        if (dbImage.imageType !== expectedType || dbImage.sortOrder !== i) {
          isCorrect = false;
          errorDetails.push(`Position ${i + 1}: Expected ${expectedType} (sortOrder: ${i}), got ${dbImage.imageType} (sortOrder: ${dbImage.sortOrder})`);
        }
      }

      if (isCorrect) {
        console.log(`✅ ${productNameClean} - Correct order`);
        correctCount++;
      } else {
        console.log(`❌ ${productNameClean} - INCORRECT ORDER:`);
        errorDetails.forEach(detail => console.log(`   ${detail}`));
        
        console.log(`   Current order in DB:`);
        product.images.forEach((img, i) => {
          console.log(`     ${i + 1}. ${img.imageType} (sortOrder: ${img.sortOrder})`);
        });
        
        console.log(`   Expected order from files:`);
        originalFiles.forEach((file, i) => {
          const expectedType = expectedTypes[i] || 'GENERAL';
          console.log(`     ${i + 1}. ${expectedType} (from ${file.filename})`);
        });
        console.log('');
        
        incorrectCount++;
      }
    }

    console.log('\\n📊 SUMMARY:');
    console.log(`✅ Correct: ${correctCount} products`);
    console.log(`❌ Incorrect: ${incorrectCount} products`);

  } catch (error) {
    console.error('❌ Error checking image order:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkImageOrder().catch(console.error);