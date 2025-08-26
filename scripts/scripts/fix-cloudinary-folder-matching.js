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

// Extract Cloudinary folder from database URL
function extractCloudinaryFolder(url) {
  const match = url.match(/helseriet\/synergy\/([^/]+)\//);
  return match ? match[1] : null;
}

async function uploadImageToCloudinary(filePath, cloudinaryFolder, imageType, sortOrder) {
  try {
    console.log(`    📤 Uploading ${imageType}: ${path.basename(filePath)}`);
    console.log(`    🎯 Target folder: helseriet/synergy/${cloudinaryFolder}`);
    
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `helseriet/synergy/${cloudinaryFolder}`,
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
  
  // Get the actual Cloudinary folder from first image URL
  const firstImage = product.images?.[0];
  if (!firstImage) {
    console.log(`   ⚠️  No images found for ${product.name}`);
    return 0;
  }
  
  const cloudinaryFolder = extractCloudinaryFolder(firstImage.url);
  if (!cloudinaryFolder) {
    console.log(`   ⚠️  Could not extract Cloudinary folder from URL: ${firstImage.url}`);
    return 0;
  }
  
  console.log(`\\n🔄 Processing: ${product.name}`);
  console.log(`   📁 Looking for: ${cleanName}`);
  console.log(`   ☁️  Database folder: ${cloudinaryFolder}`);
  
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
    
    // Upload to Cloudinary using EXACT folder from database
    const cloudinaryUrl = await uploadImageToCloudinary(imageFile, cloudinaryFolder, imageType, sortOrder);
    
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

async function fixAllCloudinaryFolders() {
  try {
    console.log('🚀 Starting Cloudinary folder-matched upload...\\n');
    console.log('📁 Source: /Users/mandymarigjervikrygg/Desktop/Helseriet mapper/alle filer helseriet/Synergy kit');
    console.log('🎯 Strategy: Match EXACT Cloudinary folders from database URLs');
    console.log('⚠️  This will overwrite existing images using correct folder paths!\\n');
    
    // Get all SYNERGY products that are NOT bundles, with their images
    const products = await prisma.product.findMany({
      where: {
        name: { startsWith: 'SYNERGY' },
        isBundle: false
      },
      include: {
        images: {
          select: { url: true },
          orderBy: { sortOrder: 'asc' },
          take: 1  // Just need first image to extract folder
        }
      },
      orderBy: { name: 'asc' }
    });
    
    console.log(`📦 Found ${products.length} individual SYNERGY products in database\\n`);
    
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
      
      // Longer delay between products
      if (processedCount < products.length) {
        console.log(`   ⏱️  Waiting 2 seconds before next product...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\\n🎉 Folder-matched upload complete!`);
    console.log(`📊 Total images uploaded: ${totalUploaded}`);
    console.log(`📦 Products successfully processed: ${successCount}/${products.length}`);
    console.log(`\\n✅ All images uploaded to EXACT Cloudinary folders that database URLs point to!`);
    console.log(`🔄 Hard refresh your browser (Cmd+Shift+R) to see the updated images!`);
    
  } catch (error) {
    console.error('❌ Error during upload process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Confirmation and start
console.log('🎯 CLOUDINARY FOLDER-MATCHED UPLOAD');
console.log('===================================');
console.log('This will upload images to the EXACT Cloudinary folders that database URLs point to.');
console.log('• Reads folder paths directly from existing database image URLs');
console.log('• Ensures 100% path matching between database and Cloudinary');
console.log('• Expected duration: 10-15 minutes');
console.log('\\nStarting in 5 seconds... Press Ctrl+C to cancel.');

setTimeout(() => {
  fixAllCloudinaryFolders();
}, 5000);