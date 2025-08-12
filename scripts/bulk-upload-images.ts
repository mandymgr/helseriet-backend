import fs from 'fs';
import path from 'path';
import { uploadToCloudinary } from '../src/config/cloudinary';
import prisma from '../src/config/database';
import sharp from 'sharp';
import dotenv from 'dotenv';

// Last inn environment variabler
dotenv.config();

interface ImageUploadResult {
  filename: string;
  success: boolean;
  cloudinaryUrl?: string;
  error?: string;
}

const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const IMAGES_DIRECTORY = '/Users/mandymarigjervikrygg/Desktop/helseriet-projekt/images';

async function processAndUploadImage(
  imagePath: string, 
  productId: string, 
  index: number
): Promise<ImageUploadResult> {
  try {
    const filename = path.basename(imagePath);
    
    // Les bildefilen
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Prosesser bildet med Sharp
    const processedBuffer = await sharp(imageBuffer)
      .resize(1200, 1200, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ 
        quality: 85,
        progressive: true 
      })
      .toBuffer();

    // Last opp til Cloudinary
    const uploadResult = await uploadToCloudinary(processedBuffer, {
      folder: `helseriet/products/${productId}`,
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto' },
        { format: 'auto' }
      ]
    });

    return {
      filename,
      success: true,
      cloudinaryUrl: uploadResult.secure_url
    };

  } catch (error) {
    return {
      filename: path.basename(imagePath),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function main() {
  try {
    console.log('🚀 Starting bulk image upload...');
    console.log(`📁 Images directory: ${IMAGES_DIRECTORY}`);

    // Sjekk om mappen eksisterer
    if (!fs.existsSync(IMAGES_DIRECTORY)) {
      throw new Error(`Directory not found: ${IMAGES_DIRECTORY}`);
    }

    // Les alle filer i mappen og undermapper
    function getAllImageFiles(dir: string): string[] {
      const files: string[] = [];
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Rekursivt søk i undermapper
          files.push(...getAllImageFiles(fullPath));
        } else if (stat.isFile()) {
          const ext = path.extname(item).toLowerCase();
          if (SUPPORTED_FORMATS.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
      
      return files;
    }

    const imageFiles = getAllImageFiles(IMAGES_DIRECTORY);

    if (imageFiles.length === 0) {
      console.log('❌ No supported image files found in directory');
      console.log('Supported formats:', SUPPORTED_FORMATS.join(', '));
      return;
    }

    console.log(`📸 Found ${imageFiles.length} image files`);
    console.log('First 10 files:', imageFiles.slice(0, 10).map(f => path.basename(f)).join(', '));

    // Opprett test-produkt
    console.log('\n🔨 Creating test product...');
    
    let category = await prisma.category.findFirst({
      where: { name: 'Test Category' }
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          name: 'Test Category',
          slug: 'test-category'
        }
      });
    }

    const testProduct = await prisma.product.create({
      data: {
        name: 'Test Product for Bulk Upload',
        slug: `test-product-${Date.now()}`,
        sku: `TEST-${Date.now()}`,
        price: 99.99,
        categoryId: category.id,
        status: 'DRAFT'
      }
    });

    console.log(`✅ Created product: ${testProduct.name} (ID: ${testProduct.id})`);

    // Last opp alle bildene
    console.log('\n📤 Starting upload process...');
    const results: ImageUploadResult[] = [];

    for (let i = 0; i < imageFiles.length; i++) {
      const fullPath = imageFiles[i];
      if (!fullPath) continue;
      const filename = path.basename(fullPath);
      
      console.log(`\n[${i + 1}/${imageFiles.length}] Processing: ${filename}`);

      const result = await processAndUploadImage(fullPath, testProduct.id, i);
      results.push(result);

      if (result.success && result.cloudinaryUrl) {
        try {
          await prisma.productImage.create({
            data: {
              productId: testProduct.id,
              url: result.cloudinaryUrl,
              altText: `${testProduct.name} - image ${i + 1}`,
              sortOrder: i
            }
          });
          console.log(`✅ ${filename} → ${result.cloudinaryUrl}`);
        } catch (dbError) {
          console.log(`⚠️  ${filename} uploaded to Cloudinary but database save failed:`, dbError);
        }
      } else {
        console.log(`❌ ${filename} failed: ${result.error}`);
      }
    }

    // Sammendrag
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log('\n' + '='.repeat(50));
    console.log('🎉 UPLOAD SUMMARY');
    console.log('='.repeat(50));
    console.log(`📁 Source directory: ${IMAGES_DIRECTORY}`);
    console.log(`🆔 Product ID: ${testProduct.id}`);
    console.log(`📊 Total files: ${imageFiles.length}`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);

    if (failed > 0) {
      console.log('\n❌ Failed uploads:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`   - ${r.filename}: ${r.error}`);
      });
    }

    console.log('\n🎯 All done! Check your Cloudinary dashboard and database.');

  } catch (error) {
    console.error('💥 Bulk upload failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Kjør scriptet
main();