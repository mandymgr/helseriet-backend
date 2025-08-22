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

async function fixAllProductImageOrder() {
  console.log('🔧 FIXING ALL SYNERGY PRODUCT IMAGE ORDER');
  console.log('==========================================');

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

    console.log(`📦 Found ${products.length} SYNERGY products to process`);

    let successCount = 0;
    let skipCount = 0;

    for (const product of products) {
      const productNameClean = product.name.replace('SYNERGY - ', '');
      console.log(`\\n📦 Processing: ${productNameClean}`);
      
      // Get original images from file system
      const originalPath = path.join(SYNERGY_KIT_PATH, productNameClean);
      
      if (!fs.existsSync(originalPath)) {
        console.log(`❌ Original folder not found: ${originalPath}`);
        skipCount++;
        continue;
      }

      const allFiles = fs.readdirSync(originalPath);
      const originalFiles = allFiles
        .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file))
        .map(file => ({
          path: path.join(originalPath, file),
          filename: file,
          correctOrder: getCorrectImageOrder(file)
        }))
        .filter(file => file.correctOrder < 99)
        .sort((a, b) => a.correctOrder - b.correctOrder);

      if (originalFiles.length === 0) {
        console.log('❌ No identifiable files to fix');
        skipCount++;
        continue;
      }

      console.log(`📸 Fixing ${originalFiles.length} images...`);

      // Delete existing images from database
      await prisma.productImage.deleteMany({
        where: { productId: product.id }
      });

      // Re-upload images in correct order
      for (let i = 0; i < originalFiles.length; i++) {
        const file = originalFiles[i];
        const imageType = getImageTypeFromOrder(i);
        
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
          
          console.log(`✅ ${imageType} - ${cloudinaryUrl.split('/').pop()}`);
        } else {
          console.log(`❌ Failed to upload: ${file.filename}`);
        }
      }

      successCount++;
    }

    console.log('\\n🎉 BATCH PROCESSING COMPLETE!');
    console.log(`✅ Successfully processed: ${successCount} products`);
    console.log(`⏭️  Skipped: ${skipCount} products`);

  } catch (error) {
    console.error('❌ Error in batch processing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllProductImageOrder().catch(console.error);