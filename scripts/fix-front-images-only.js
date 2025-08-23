#!/usr/bin/env node

require('dotenv').config();
const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const synergyKitPath = '/Users/mandymarigjervikrygg/Desktop/Helseriet mapper/alle filer helseriet/Synergy kit ';

// Database folder names (exact from your URLs)
const folderMap = {
  'Barley Grass Juice Powder': 'synergy-barley-grass-juice-powder',
  'Beet Juice Powder': 'synergy-beet-juice-powder', 
  'Berry Power': 'synergy-berry-power',
  'Blue Green Algae Kapsler': 'synergy-blue-green-algae-kapsler',
  'Blue Green Algae Pulver': 'synergy-blue-green-algae-pulver',
  'Bone Renewal': 'synergy-bone-renewal',
  'Cell Protector': 'synergy-cell-protector',
  'Choline Complex': 'synergy-choline-complex',
  'D3 + K2 Complex': 'synergy-d3-k2-complex',
  'Enzyme Power': 'synergy-enzyme-power',
  'Eye Protector': 'synergy-eye-protector',
  'Heart Protector': 'synergy-heart-protector',
  'Immune Health': 'synergy-immune-health',
  'Matcha Power Kapsler': 'synergy-matcha-power-kapsler',
  'Matcha Power Pulver': 'synergy-matcha-power-pulver',
  'Multi Vitamin': 'synergy-multi-vitamin',
  'Multi Vitamin 60': 'synergy-multi-vitamin-60',
  'Organic Superfood': 'synergy-organic-superfood',
  'Organic Superfood Pulver': 'synergy-organic-superfood-pulver',
  'Pure Radiance C Kapsler': 'synergy-pure-radiance-c-kapsler',
  'Pure Radiance C Pulver': 'synergy-pure-radiance-c-pulver',
  'PureNatal': 'synergy-purenatal',
  'Radiant Mood': 'synergy-radiant-mood',
  'Rapid Rescue': 'synergy-rapid-rescue',
  'Stress Remedy': 'synergy-stress-remedy',
  'Super B-Complex': 'synergy-super-b-complex',
  'SuperPure Astaxanthin': 'synergy-superpure-astaxanthin',
  'SuperPure Beta 1,3-Glucan': 'synergy-superpure-beta-1-3-glucan',
  'SuperPure Fucoidan': 'synergy-superpure-fucoidan',
  'SuperPure Ginger': 'synergy-superpure-ginger',
  'SuperPure Grape Seed': 'synergy-superpure-grape-seed',
  'SuperPure Milk Thistle': 'synergy-superpure-milk-thistle',
  'SuperPure Olive': 'synergy-superpure-olive',
  'SuperPure Oregano': 'synergy-superpure-oregano',
  'SuperPure Resveratrol': 'synergy-superpure-resveratrol',
  'SuperPure Turmeric': 'synergy-superpure-turmeric',
  'Vita-Min-Balance for Women': 'synergy-vita-min-balance-for-women',
  'Vita-Min-Herb for Men': 'synergy-vita-min-herb-for-men',
  'Vita-Min-Vitality for Men': 'synergy-vita-min-vitality-for-men',
  'Wheat Grass Juice Powder': 'synergy-wheat-grass-juice-powder',
  'Zinc Complex': 'synergy-zinc-complex'
};

// Find PDP file (FRONT image)
function findPDPFile(productDir) {
  try {
    const files = fs.readdirSync(productDir);
    
    // Look for PDP files in priority order
    const pdpPatterns = ['PDP.jpg', 'PDP.png', '_PDP.jpg', '_PDP.png'];
    
    // Try exact matches first
    for (const pattern of pdpPatterns) {
      const exactFile = path.join(productDir, pattern);
      if (fs.existsSync(exactFile)) {
        return exactFile;
      }
    }
    
    // Try pattern matching
    for (const file of files) {
      if (file.toLowerCase().includes('pdp')) {
        return path.join(productDir, file);
      }
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

async function uploadFrontImage(productName, cloudinaryFolder) {
  console.log(`\\n🔄 ${productName}`);
  
  const productDir = path.join(synergyKitPath, productName);
  
  if (!fs.existsSync(productDir)) {
    console.log(`   ❌ Directory not found`);
    return false;
  }
  
  const pdpFile = findPDPFile(productDir);
  
  if (!pdpFile) {
    console.log(`   ❌ No PDP file found`);
    return false;
  }
  
  console.log(`   📤 Uploading: ${path.basename(pdpFile)}`);
  
  try {
    const result = await cloudinary.uploader.upload(pdpFile, {
      folder: `helseriet/synergy/${cloudinaryFolder}`,
      public_id: 'image_1',
      resource_type: 'image',
      overwrite: true,
      transformation: [
        { quality: 'auto', fetch_format: 'auto' },
        { width: 800, height: 800, crop: 'pad', background: 'white' }
      ]
    });
    
    console.log(`   ✅ SUCCESS: ${result.secure_url}`);
    return true;
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return false;
  }
}

async function fixAllFrontImages() {
  console.log('🚀 FIXING FRONT IMAGES ONLY\\n');
  console.log('Strategy: Upload PDP files as image_1 to existing Cloudinary folders\\n');
  
  let successCount = 0;
  let totalCount = Object.keys(folderMap).length;
  
  for (const [productName, cloudinaryFolder] of Object.entries(folderMap)) {
    const success = await uploadFrontImage(productName, cloudinaryFolder);
    if (success) successCount++;
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\\n🎉 DONE!`);
  console.log(`✅ Success: ${successCount}/${totalCount}`);
  console.log(`\\nRefresh your browser to see FRONT images!`);
}

console.log('⚡ SIMPLE FRONT IMAGE FIX');
console.log('=========================');
console.log('This will ONLY fix FRONT images (image_1) for all SYNERGY products.');
console.log('Fast and simple - focuses on the main problem.\\n');

setTimeout(() => {
  fixAllFrontImages();
}, 3000);