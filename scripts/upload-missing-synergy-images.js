#!/usr/bin/env node

require('dotenv').config();
const { v2: cloudinary } = require('cloudinary');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const synergyImagesPath = '/Users/mandymarigjervikrygg/Desktop/helseriet-projekt/helseriet-frontend/public/images/brands/synergy';

// Map image types to file patterns
const imagePatterns = {
  'FRONT': ['PDP.jpg', 'PDP.png', '_PDP.jpg'],
  'SIDE': ['LP.jpg', 'LP.png', '_LP.jpg'],  
  'BACK': ['RP.jpg', 'RP.png', '_RP.jpg'],
  'INGREDIENTS': ['Facts.jpg', 'Facts.png', '_Facts.jpg']
};

// Function to find image file in product directory
function findImageFile(productDir, imageType) {
  const patterns = imagePatterns[imageType];
  
  for (const pattern of patterns) {
    // Try exact match first
    const exactFile = path.join(productDir, pattern);
    if (fs.existsSync(exactFile)) {
      return exactFile;
    }
    
    // Try pattern matching
    const files = fs.readdirSync(productDir);
    for (const file of files) {
      if (file.toLowerCase().includes(pattern.toLowerCase().replace('.jpg', '').replace('.png', ''))) {
        return path.join(productDir, file);
      }
    }
  }
  
  return null;
}

// Function to clean product name for directory matching
function cleanProductName(name) {
  return name
    .replace(/^SYNERGY - /, '')
    .trim();
}

// Function to create slug from product name
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function uploadImageToCloudinary(filePath, productSlug, imageType, sortOrder) {
  try {
    console.log(`  📤 Uploading ${imageType}: ${path.basename(filePath)}`);
    
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `helseriet/synergy/${productSlug}`,
      public_id: `image_${sortOrder + 1}`,
      resource_type: 'image',
      overwrite: true,
      transformation: [
        { quality: 'auto', fetch_format: 'auto' },
        { width: 800, height: 800, crop: 'pad', background: 'white' }
      ]
    });

    return result.secure_url;
  } catch (error) {
    console.error(`    ❌ Error uploading ${imageType}:`, error.message);
    return null;
  }
}

async function processProduct(product) {
  const cleanName = cleanProductName(product.name);
  const productSlug = createSlug(cleanName);
  
  console.log(`\n🔄 Processing: ${product.name}`);
  console.log(`   📁 Looking for: ${cleanName}`);
  
  // Find product directory
  const productDir = path.join(synergyImagesPath, cleanName);
  
  if (!fs.existsSync(productDir)) {
    console.log(`   ⚠️  Directory not found: ${productDir}`);
    return;
  }
  
  // Check current images in database
  const existingImages = await prisma.productImage.findMany({
    where: { productId: product.id },
    orderBy: { sortOrder: 'asc' }
  });
  
  console.log(`   📊 Current images: ${existingImages.length}`);
  
  const imageTypes = ['FRONT', 'SIDE', 'BACK', 'INGREDIENTS'];
  let uploadedCount = 0;
  
  for (let i = 0; i < imageTypes.length; i++) {
    const imageType = imageTypes[i];
    const sortOrder = i;
    
    // Check if this image type already exists
    const existingImage = existingImages.find(img => 
      img.imageType === imageType || img.sortOrder === sortOrder
    );
    
    if (existingImage) {
      console.log(`   ✅ ${imageType} already exists (sortOrder: ${sortOrder})`);
      continue;
    }
    
    // Find image file
    const imageFile = findImageFile(productDir, imageType);
    
    if (!imageFile) {
      console.log(`   ⚠️  ${imageType} image not found`);
      continue;
    }
    
    // Upload to Cloudinary
    const cloudinaryUrl = await uploadImageToCloudinary(imageFile, productSlug, imageType, sortOrder);
    
    if (cloudinaryUrl) {
      // Save to database
      try {
        await prisma.productImage.create({
          data: {
            productId: product.id,
            url: cloudinaryUrl,
            altText: `${product.name} - ${imageType} Image`,
            sortOrder: sortOrder,
            imageType: imageType,
            isPrimary: imageType === 'FRONT',
            originalFileName: path.basename(imageFile)
          }
        });
        
        console.log(`   ✅ ${imageType} uploaded and saved`);
        uploadedCount++;
      } catch (dbError) {
        console.error(`   ❌ Database error for ${imageType}:`, dbError.message);
      }
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`   📊 Uploaded ${uploadedCount} new images`);
  return uploadedCount;
}

async function uploadAllMissingImages() {
  try {
    console.log('🚀 Starting upload of missing SYNERGY images...\n');
    
    // Get all SYNERGY products that are not bundles
    const products = await prisma.product.findMany({
      where: {
        name: { startsWith: 'SYNERGY' },
        isBundle: false
      },
      include: {
        images: true
      }
    });
    
    console.log(`📦 Found ${products.length} SYNERGY products\n`);
    
    let totalUploaded = 0;
    
    for (const product of products) {
      const uploaded = await processProduct(product);
      totalUploaded += uploaded || 0;
    }
    
    console.log(`\n🎉 Upload complete!`);
    console.log(`📊 Total new images uploaded: ${totalUploaded}`);
    
    // Final count
    const finalImageCount = await prisma.productImage.count({
      where: {
        product: {
          name: { startsWith: 'SYNERGY' },
          isBundle: false
        }
      }
    });
    
    console.log(`📸 Total SYNERGY images in database: ${finalImageCount}`);
    
    if (finalImageCount >= 160) { // Should be close to 164 (41 * 4)
      console.log(`✅ Image upload appears successful!`);
    } else {
      console.log(`⚠️  Expected ~164 images, got ${finalImageCount}`);
    }
    
  } catch (error) {
    console.error('❌ Error during upload process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the upload
uploadAllMissingImages();