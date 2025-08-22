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

const MULTI_VITAMIN_60_PATH = '/Users/mandymarigjervikrygg/Desktop/Helseriet mapper/alle filer helseriet/Synergy kit /Multi Vitamin 60';

// Upload image to Cloudinary
const uploadImageToCloudinary = async (imagePath, productSlug, imageIndex) => {
  try {
    const result = await cloudinary.uploader.upload(imagePath, {
      folder: `helseriet/synergy/${productSlug}`,
      public_id: `image_${imageIndex + 1}`,
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

async function fixMultiVitamin60Images() {
  console.log('🔧 Fixing Multi Vitamin 60 images...');
  console.log('====================================\n');

  try {
    // Find the Multi Vitamin 60 product
    const product = await prisma.product.findFirst({
      where: { name: 'SYNERGY - Multi Vitamin 60' },
      include: { images: true }
    });

    if (!product) {
      console.log('❌ Multi Vitamin 60 product not found');
      return;
    }

    console.log(`📦 Found product: ${product.name}`);
    console.log(`📸 Current images: ${product.images.length}`);

    // Get all image files from the folder
    const imageFiles = fs.readdirSync(MULTI_VITAMIN_60_PATH)
      .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file))
      .map(file => path.join(MULTI_VITAMIN_60_PATH, file));

    console.log(`📁 Found ${imageFiles.length} images in folder:`);
    imageFiles.forEach((file, i) => {
      console.log(`   ${i + 1}. ${path.basename(file)}`);
    });

    // Delete existing images
    console.log('\n🗑️  Deleting existing images...');
    await prisma.productImage.deleteMany({
      where: { productId: product.id }
    });
    console.log('✅ Deleted existing images');

    // Upload all images
    console.log('\n📤 Uploading all images...');
    let uploadedCount = 0;

    for (let i = 0; i < imageFiles.length; i++) {
      const imagePath = imageFiles[i];
      const filename = path.basename(imagePath);
      
      console.log(`   📤 Uploading image ${i + 1}/${imageFiles.length}: ${filename}`);
      
      const cloudinaryUrl = await uploadImageToCloudinary(imagePath, product.slug, i);
      
      if (cloudinaryUrl) {
        await prisma.productImage.create({
          data: {
            productId: product.id,
            url: cloudinaryUrl,
            altText: `${product.name} - Image ${i + 1}`,
            sortOrder: i,
            imageType: i === 0 ? 'FRONT' : 'GENERAL',
            isPrimary: i === 0
          }
        });
        
        uploadedCount++;
        console.log(`   ✅ Uploaded and connected image ${i + 1}`);
      } else {
        console.log(`   ❌ Failed to upload image ${i + 1}`);
      }
    }

    // Verify final count
    const finalProduct = await prisma.product.findFirst({
      where: { id: product.id },
      include: { _count: { select: { images: true } } }
    });

    console.log('\n🎉 MULTI VITAMIN 60 IMAGES FIXED!');
    console.log('=================================');
    console.log(`📸 Images before: ${product.images.length}`);
    console.log(`📸 Images after: ${finalProduct._count.images}`);
    console.log(`📤 Successfully uploaded: ${uploadedCount}/${imageFiles.length}`);
    
    if (finalProduct._count.images === 4) {
      console.log('✅ Multi Vitamin 60 now has complete image set!');
    }

  } catch (error) {
    console.error('❌ Error fixing Multi Vitamin 60 images:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMultiVitamin60Images().catch(console.error);