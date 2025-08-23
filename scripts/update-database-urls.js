#!/usr/bin/env node

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateDatabaseUrls() {
  try {
    console.log('🔄 Updating database URLs to match new Cloudinary timestamps...\n');
    
    // Get all SYNERGY product images that need updating
    const products = await prisma.product.findMany({
      where: {
        name: { startsWith: 'SYNERGY' },
        isBundle: false
      },
      include: {
        images: {
          where: { sortOrder: 0 }, // Only FRONT images
          select: { id: true, url: true }
        }
      }
    });
    
    let updatedCount = 0;
    
    for (const product of products) {
      if (!product.images.length) continue;
      
      const image = product.images[0];
      const oldUrl = image.url;
      
      // Extract folder name from old URL
      const folderMatch = oldUrl.match(/helseriet\/synergy\/([^\/]+)\//);
      if (!folderMatch) continue;
      
      const folder = folderMatch[1];
      
      // Create new URL without timestamp (let Cloudinary handle auto-versioning)
      const newUrl = `https://res.cloudinary.com/dtagymjm2/image/upload/helseriet/synergy/${folder}/image_1.webp`;
      
      console.log(`🔄 ${product.name}`);
      console.log(`   OLD: ${oldUrl}`);
      console.log(`   NEW: ${newUrl}`);
      
      // Update database
      await prisma.productImage.update({
        where: { id: image.id },
        data: { url: newUrl }
      });
      
      updatedCount++;
      console.log(`   ✅ Updated\n`);
    }
    
    console.log(`🎉 Updated ${updatedCount} FRONT image URLs`);
    console.log(`📡 URLs now point directly to latest Cloudinary images without timestamps`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

console.log('🔄 DATABASE URL UPDATE');
console.log('=====================');
console.log('This will update database URLs to point to the newly uploaded images.');
console.log('Removes timestamps so Cloudinary serves latest version automatically.\n');

setTimeout(() => {
  updateDatabaseUrls();
}, 2000);