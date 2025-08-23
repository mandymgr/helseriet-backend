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

// Enhanced detection for all filename patterns
const getCorrectImageOrder = (originalPath) => {
  const filename = path.basename(originalPath).toLowerCase();
  
  // Priority order: PDP (0), LP (1), RP (2), Facts (3)
  if (filename.includes('pdp') || filename.includes('_pdp')) return 0;
  if (filename.includes('_lp') || filename === 'lp.jpg' || filename.includes('ix_lp')) return 1;
  if (filename.includes('_rp') || filename === 'rp.jpg' || filename.includes('x_rp')) return 2;
  if (filename.includes('facts') || filename.includes('fact') || filename.includes('_facts') || filename.includes('iv_facts')) return 3;
  
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

async function fixSpecificProducts() {
  console.log('🔧 FIXING WHEAT GRASS JUICE AND ZINC COMPLEX');
  console.log('============================================');

  try {
    const productsToFix = [
      'SYNERGY - Wheat Grass Juice Powder',
      'SYNERGY - Zinc Complex'
    ];

    for (const productName of productsToFix) {
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
      console.log(`\\n📦 Fixing: ${productNameClean}`);
      
      // Get original images from file system
      const originalPath = path.join(SYNERGY_KIT_PATH, productNameClean);
      
      if (!fs.existsSync(originalPath)) {
        console.log(`❌ Original folder not found: ${originalPath}`);
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

      console.log(`📸 Original files in correct order:`);
      originalFiles.forEach((file, i) => {
        const type = getImageTypeFromOrder(file.correctOrder);
        console.log(`   ${i + 1}. ${file.filename} → Order: ${file.correctOrder} → Type: ${type}`);
      });

      if (originalFiles.length === 0) {
        console.log('❌ No identifiable files to fix');
        continue;
      }

      // Delete existing images from database
      console.log('🗑️  Deleting existing database entries...');
      await prisma.productImage.deleteMany({
        where: { productId: product.id }
      });

      // Re-upload images in correct order
      for (let i = 0; i < originalFiles.length; i++) {
        const file = originalFiles[i];
        const imageType = getImageTypeFromOrder(i);
        
        console.log(`📤 Uploading ${i + 1}/${originalFiles.length}: ${file.filename} as ${imageType}`);
        
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
          
          console.log(`✅ Created: ${imageType} - ${cloudinaryUrl.split('/').pop()}`);
        } else {
          console.log(`❌ Failed to upload: ${file.filename}`);
        }
      }

      // Verify results
      const updatedProduct = await prisma.product.findFirst({
        where: { id: product.id },
        include: { 
          images: { orderBy: { sortOrder: 'asc' } }
        }
      });

      console.log('\\n✅ VERIFICATION - New order:');
      updatedProduct.images.forEach((img, i) => {
        const filename = img.url.split('/').pop();
        console.log(`   ${i + 1}. ${img.imageType} (sortOrder: ${img.sortOrder}) - ${filename} ${img.isPrimary ? '⭐' : ''}`);
      });
    }

    console.log('\\n🎉 SPECIFIC PRODUCTS FIXED!');

  } catch (error) {
    console.error('❌ Error fixing specific products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSpecificProducts().catch(console.error);