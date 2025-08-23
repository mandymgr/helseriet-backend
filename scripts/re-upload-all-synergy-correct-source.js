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

const synergyKitPath = '/Users/mandymarigjervikrygg/Desktop/Helseriet mapper/alle filer helseriet/Synergy kit ';

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
    try {
      const files = fs.readdirSync(productDir);
      for (const file of files) {
        if (file.toLowerCase().includes(pattern.toLowerCase().replace('.jpg', '').replace('.png', ''))) {
          return path.join(productDir, file);
        }
      }
    } catch (e) {
      // Directory doesn't exist
      return null;
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

// Function to create slug from product name (for Cloudinary folder)
function createSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\\s-]/g, '')
    .replace(/\\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function uploadImageToCloudinary(filePath, productSlug, imageType, sortOrder) {
  try {
    console.log(`    📤 Uploading ${imageType}: ${path.basename(filePath)}`);
    
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `helseriet/synergy/synergy-${productSlug}`,
      public_id: `image_${sortOrder + 1}`,
      resource_type: 'image',
      overwrite: true,
      transformation: [
        { quality: 'auto', fetch_format: 'auto' },
        { width: 800, height: 800, crop: 'pad', background: 'white' }
      ]
    });

    console.log(`    ✅ ${imageType} uploaded successfully`);
    return result.secure_url;
  } catch (error) {
    console.error(`    ❌ Error uploading ${imageType}:`, error.message);
    return null;
  }
}

async function processProduct(product) {
  const cleanName = cleanProductName(product.name);
  const productSlug = createSlug(cleanName);
  
  console.log(`\\n🔄 Processing: ${product.name}`);
  console.log(`   📁 Looking for: ${cleanName}`);
  console.log(`   ☁️  Cloudinary target: helseriet/synergy/synergy-${productSlug}`);
  
  // Find product directory in the Synergy kit
  const productDir = path.join(synergyKitPath, cleanName);
  
  if (!fs.existsSync(productDir)) {
    console.log(`   ⚠️  Directory not found: ${productDir}`);
    return 0;
  }
  
  console.log(`   📂 Files: ${fs.readdirSync(productDir).join(', ')}`);
  
  const imageTypes = ['FRONT', 'SIDE', 'BACK', 'INGREDIENTS'];
  let uploadedCount = 0;
  
  for (let i = 0; i < imageTypes.length; i++) {
    const imageType = imageTypes[i];
    const sortOrder = i;
    
    // Find image file
    const imageFile = findImageFile(productDir, imageType);
    
    if (!imageFile) {
      console.log(`    ⚠️  ${imageType} image not found`);
      continue;
    }
    
    console.log(`    🔍 Found ${imageType}: ${path.basename(imageFile)}`);
    
    // Upload to Cloudinary
    const cloudinaryUrl = await uploadImageToCloudinary(imageFile, productSlug, imageType, sortOrder);
    
    if (cloudinaryUrl) {
      uploadedCount++;
      console.log(`    ✅ ${imageType} processed (sortOrder: ${sortOrder} -> image_${sortOrder + 1})`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 800));
  }
  
  console.log(`   📊 Uploaded ${uploadedCount} images for ${product.name}`);
  return uploadedCount;
}

async function reUploadAllSynergyImages() {
  try {
    console.log('🚀 Starting complete re-upload of ALL SYNERGY images from correct source...\\n');
    console.log('📁 Source: /Users/mandymarigjervikrygg/Desktop/Helseriet mapper/alle filer helseriet/Synergy kit');
    console.log('⚠️  This will overwrite ALL existing Cloudinary images with fresh uploads in correct order!');
    console.log('🚫 Bundles will be SKIPPED to preserve correct bundle images.\\n');
    
    // Get all SYNERGY products that are NOT bundles
    const products = await prisma.product.findMany({
      where: {
        name: { startsWith: 'SYNERGY' },
        isBundle: false  // SKIP BUNDLES!
      },
      orderBy: { name: 'asc' }
    });
    
    console.log(`📦 Found ${products.length} individual SYNERGY products to process (bundles excluded)\\n`);
    
    let totalUploaded = 0;
    let processedCount = 0;
    let successCount = 0;
    
    for (const product of products) {
      processedCount++;
      console.log(`\\n[${processedCount}/${products.length}] Processing product...`);
      
      const uploaded = await processProduct(product);
      totalUploaded += uploaded || 0;
      
      if (uploaded > 0) {
        successCount++;
      }
      
      // Longer delay between products to be nice to Cloudinary
      if (processedCount < products.length) {
        console.log(`   ⏱️  Waiting 2 seconds before next product...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\\n🎉 Complete re-upload finished!`);
    console.log(`📊 Total images uploaded: ${totalUploaded}`);
    console.log(`📦 Products successfully processed: ${successCount}/${products.length}`);
    console.log(`📦 Products with issues: ${products.length - successCount}`);
    console.log(`\\n✅ All SYNERGY products should now have correct image order in Cloudinary:`);
    console.log(`   • image_1 = FRONT (PDP files) - Product front panel`);
    console.log(`   • image_2 = SIDE (LP files) - Left panel/side view`);
    console.log(`   • image_3 = BACK (RP files) - Right panel/back view`);
    console.log(`   • image_4 = INGREDIENTS (Facts files) - Ingredients/facts panel`);
    console.log(`\\n🔄 Hard refresh your browser (Cmd+Shift+R) to see the updated images!`);
    console.log(`🚫 Bundle images were preserved and not touched.`);
    
  } catch (error) {
    console.error('❌ Error during re-upload process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Confirmation and start
console.log('🚨 COMPLETE SYNERGY IMAGE RE-UPLOAD');
console.log('=====================================');
console.log('This will re-upload ALL SYNERGY product images from the correct source folder.');
console.log('• Source: Helseriet mapper/alle filer helseriet/Synergy kit');
console.log('• Target: All individual SYNERGY products (NOT bundles)');
console.log('• Expected duration: 10-15 minutes');
console.log('• Will overwrite existing Cloudinary images');
console.log('\\nStarting in 5 seconds... Press Ctrl+C to cancel.');

setTimeout(() => {
  reUploadAllSynergyImages();
}, 5000);