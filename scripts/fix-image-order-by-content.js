const { PrismaClient } = require('@prisma/client');
const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: 'dtagymjm2',
  api_key: '242923119824396',
  api_secret: 'ZslZ2ch3SnYPGxT3xrWtvQsMkgI'
});

const SYNERGY_KIT_PATH = '/Users/mandymarigjervikrygg/Desktop/Helseriet mapper/alle filer helseriet/Synergy kit ';

// Define correct order based on original filename patterns
const getCorrectImageOrder = (originalPath) => {
  const filename = path.basename(originalPath).toLowerCase();
  
  // Priority order: PDP (0), LP (1), RP (2), Facts (3)
  if (filename.includes('pdp')) return 0;
  if (filename.includes('_lp') || filename === 'lp.jpg') return 1;
  if (filename.includes('_rp') || filename === 'rp.jpg') return 2;
  if (filename.includes('facts') || filename.includes('fact')) return 3;
  
  // Additional patterns for numbered files
  if (filename.includes('image_1')) return 0; // Usually PDP
  if (filename.includes('image_2')) return 1; // Usually LP
  if (filename.includes('image_3')) return 2; // Usually RP  
  if (filename.includes('image_4')) return 3; // Usually Facts
  
  // Fallback - maintain current order for unrecognized files
  return 99;
};

// Get image type from order
const getImageTypeFromOrder = (order) => {
  switch (order) {
    case 0: return 'FRONT';       // PDP
    case 1: return 'SIDE';        // LP  
    case 2: return 'BACK';        // RP
    case 3: return 'INGREDIENTS'; // Facts
    default: return 'GENERAL';
  }
};

// Upload image to Cloudinary with correct naming
const uploadImageToCloudinary = async (imagePath, productSlug, correctOrder) => {
  try {
    const result = await cloudinary.uploader.upload(imagePath, {
      folder: `helseriet/synergy/${productSlug}`,
      public_id: `image_${correctOrder + 1}`, // 1-based naming
      overwrite: true,
      resource_type: 'image',
      format: 'webp',
      quality: 'auto:good',
      transformation: [
        { width: 800, height: 800, crop: 'fit', format: 'webp' }
      ]
    });
    
    return result.secure_url;
  } catch (error) {
    console.error(`Error uploading image ${imagePath}:`, error.message);
    return null;
  }
};

async function fixImageOrderByContent() {
  console.log('🔄 FIXING IMAGE ORDER BASED ON CONTENT');
  console.log('=====================================');
  console.log('📋 Correct order: PDP → LP → RP → Facts\n');

  try {
    // Get all products
    const products = await prisma.product.findMany({
      include: { 
        images: { orderBy: { sortOrder: 'asc' } }
      },
      where: {
        images: { some: {} }
      }
    });

    let totalProcessed = 0;
    let totalFixed = 0;

    for (const product of products) {
      const productNameClean = product.name.replace('SYNERGY - ', '');
      console.log(`\\n📦 Processing: ${productNameClean}`);
      
      // Get original images from file system
      const originalPath = path.join(SYNERGY_KIT_PATH, productNameClean);
      
      if (!fs.existsSync(originalPath)) {
        console.log(`   ⚠️  Original folder not found: ${originalPath}`);
        continue;
      }

      const allFiles = fs.readdirSync(originalPath);
      console.log(`   📁 Files in folder: ${allFiles.join(', ')}`);

      const originalFiles = allFiles
        .filter(file => /\\.(jpg|jpeg|png|webp)$/i.test(file))
        .map(file => ({
          path: path.join(originalPath, file),
          filename: file,
          correctOrder: getCorrectImageOrder(file)
        }))
        .filter(file => file.correctOrder < 99) // Only files we can identify
        .sort((a, b) => a.correctOrder - b.correctOrder);

      if (originalFiles.length === 0) {
        console.log('   ⚠️  No identifiable original files found');
        continue;
      }

      console.log('   📸 Original files found:');
      originalFiles.forEach((file, i) => {
        const type = getImageTypeFromOrder(file.correctOrder);
        console.log(`      ${i + 1}. ${file.filename} → ${type}`);
      });

      // Check if current order is already correct
      const currentOrder = product.images.map((img, i) => i);
      const correctOrder = originalFiles.map(f => f.correctOrder);
      
      if (JSON.stringify(currentOrder) === JSON.stringify(correctOrder)) {
        console.log('   ✅ Already in correct order');
        totalProcessed++;
        continue;
      }

      console.log('   🔄 Reordering images...');
      
      // Delete existing images from database
      await prisma.productImage.deleteMany({
        where: { productId: product.id }
      });

      // Re-upload images in correct order
      for (let i = 0; i < originalFiles.length; i++) {
        const file = originalFiles[i];
        const imageType = getImageTypeFromOrder(i);
        
        console.log(`      📤 Uploading ${i + 1}/${originalFiles.length}: ${file.filename} as ${imageType}`);
        
        const cloudinaryUrl = await uploadImageToCloudinary(file.path, product.slug, i);
        
        if (cloudinaryUrl) {
          await prisma.productImage.create({
            data: {
              productId: product.id,
              url: cloudinaryUrl,
              altText: `${product.name} - ${imageType === 'FRONT' ? 'Product Image' : 
                        imageType === 'SIDE' ? 'Left Panel' :
                        imageType === 'BACK' ? 'Right Panel' :
                        imageType === 'INGREDIENTS' ? 'Supplement Facts' : 'Image'}`,
              sortOrder: i,
              imageType: imageType,
              isPrimary: i === 0
            }
          });
          
          console.log(`      ✅ Uploaded: ${imageType}`);
        } else {
          console.log(`      ❌ Failed to upload: ${file.filename}`);
        }
      }

      totalFixed++;
      totalProcessed++;
      console.log('   ✅ Product images reordered correctly');
    }

    console.log('\\n🎉 IMAGE REORDERING COMPLETE!');
    console.log('==============================');
    console.log(`📦 Products processed: ${totalProcessed}`);
    console.log(`🔄 Products fixed: ${totalFixed}`);
    console.log(`✅ Products already correct: ${totalProcessed - totalFixed}`);
    
    console.log('\\n📋 VERIFIED ORDER:');
    console.log('1. PDP (Product Detail Page) → FRONT');
    console.log('2. LP (Left Panel) → SIDE');  
    console.log('3. RP (Right Panel) → BACK');
    console.log('4. Facts (Supplement Facts) → INGREDIENTS');

  } catch (error) {
    console.error('❌ Error fixing image order:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixImageOrderByContent().catch(console.error);