import fs from 'fs';
import path from 'path';
import { uploadToCloudinary } from '../src/config/cloudinary';
import prisma from '../src/config/database';
import sharp from 'sharp';
import dotenv from 'dotenv';

dotenv.config();

interface ImageUploadResult {
  filename: string;
  brand: string;
  product: string;
  success: boolean;
  cloudinaryUrl?: string;
  error?: string;
}

const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const IMAGES_DIRECTORY = '/Users/mandymarigjervikrygg/Desktop/helseriet-projekt/images';

async function processAndUploadImage(
  imagePath: string, 
  brand: string,
  productName: string,
  filename: string
): Promise<ImageUploadResult> {
  try {
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

    // Lag organisert mappe-struktur i Cloudinary
    const cloudinaryFolder = `helseriet/brands/${brand}/${productName}`;

    // Last opp til Cloudinary med organisert struktur
    const uploadResult = await uploadToCloudinary(processedBuffer, {
      folder: cloudinaryFolder,
      public_id: filename.replace(/\.[^/.]+$/, ""), // Fjern filextension
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto' },
        { format: 'auto' }
      ]
    });

    return {
      filename,
      brand,
      product: productName,
      success: true,
      cloudinaryUrl: uploadResult.secure_url
    };

  } catch (error) {
    return {
      filename,
      brand,
      product: productName,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function createBrandCategories() {
  const brands = ['organixx', 'shakti', 'synergy'];
  const brandCategories: Record<string, string> = {};

  for (const brandName of brands) {
    let category = await prisma.category.findFirst({
      where: { slug: brandName }
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          name: brandName.charAt(0).toUpperCase() + brandName.slice(1),
          slug: brandName,
          description: `${brandName} brand products`
        }
      });
      console.log(`✅ Created category: ${category.name}`);
    }

    brandCategories[brandName] = category.id;
  }

  return brandCategories;
}

async function main() {
  try {
    console.log('🚀 Starting organized bulk image upload...');
    console.log(`📁 Images directory: ${IMAGES_DIRECTORY}`);

    if (!fs.existsSync(IMAGES_DIRECTORY)) {
      throw new Error(`Directory not found: ${IMAGES_DIRECTORY}`);
    }

    // Opprett brand-kategorier
    console.log('🔨 Creating brand categories...');
    const brandCategories = await createBrandCategories();

    // Organiser filer etter brand og produkt
    const organizedFiles: Record<string, Record<string, string[]>> = {};
    
    function scanDirectory(dir: string) {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (stat.isFile()) {
          const ext = path.extname(item).toLowerCase();
          if (SUPPORTED_FORMATS.includes(ext)) {
            // Finn brand og produkt fra mappestruktur
            const relativePath = path.relative(IMAGES_DIRECTORY, fullPath);
            const pathParts = relativePath.split(path.sep);
            
            if (pathParts.length >= 3 && pathParts[0] === 'brands') {
              const brand = pathParts[1];
              const productDir = pathParts[2];
              
              if (!organizedFiles[brand]) {
                organizedFiles[brand] = {};
              }
              if (!organizedFiles[brand][productDir]) {
                organizedFiles[brand][productDir] = [];
              }
              organizedFiles[brand][productDir].push(fullPath);
            }
          }
        }
      }
    }

    scanDirectory(IMAGES_DIRECTORY);

    // Telle totale filer
    let totalFiles = 0;
    Object.values(organizedFiles).forEach(brand => {
      Object.values(brand).forEach(files => {
        totalFiles += files.length;
      });
    });

    console.log(`📸 Found ${totalFiles} image files organized by brand and product`);
    
    // Vis organisasjonsstruktur
    Object.entries(organizedFiles).forEach(([brand, products]) => {
      console.log(`📦 ${brand.toUpperCase()}:`);
      Object.entries(products).forEach(([product, files]) => {
        console.log(`  └── ${product} (${files.length} files)`);
      });
    });

    console.log('\n📤 Starting upload process...');
    const results: ImageUploadResult[] = [];
    let currentFile = 0;

    // Last opp filer organisert etter brand og produkt
    for (const [brand, products] of Object.entries(organizedFiles)) {
      console.log(`\n🏷️  Processing brand: ${brand.toUpperCase()}`);
      
      for (const [productDir, files] of Object.entries(products)) {
        console.log(`\n  📦 Processing product: ${productDir} (${files.length} files)`);
        
        // Opprett produkt i database
        let product = await prisma.product.findFirst({
          where: { 
            slug: `${brand}-${productDir.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
          }
        });

        if (!product && brandCategories[brand]) {
          product = await prisma.product.create({
            data: {
              name: `${brand.toUpperCase()} - ${productDir}`,
              slug: `${brand}-${productDir.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
              sku: `${brand.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              price: 99.99,
              categoryId: brandCategories[brand],
              status: 'DRAFT',
              description: `${productDir} product from ${brand}`
            }
          });
          console.log(`    ✅ Created product: ${product.name}`);
        }

        // Last opp bildene for dette produktet
        for (let i = 0; i < files.length; i++) {
          const filePath = files[i];
          const filename = path.basename(filePath);
          currentFile++;

          console.log(`    [${currentFile}/${totalFiles}] ${filename}`);

          const result = await processAndUploadImage(
            filePath, 
            brand, 
            productDir,
            filename
          );
          results.push(result);

          // Lagre bilde i database hvis opplasting var vellykket
          if (result.success && result.cloudinaryUrl && product) {
            try {
              await prisma.productImage.create({
                data: {
                  productId: product.id,
                  url: result.cloudinaryUrl,
                  altText: `${product.name} - ${filename}`,
                  sortOrder: i
                }
              });
              console.log(`    ✅ ${filename} → Uploaded and saved`);
            } catch (dbError) {
              console.log(`    ⚠️  ${filename} → Uploaded to Cloudinary but DB save failed`);
            }
          } else {
            console.log(`    ❌ ${filename} → Failed: ${result.error}`);
          }

          // Kort pause for å ikke overbelaste Cloudinary
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    // Sammendrag
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log('\n' + '='.repeat(60));
    console.log('🎉 ORGANIZED UPLOAD SUMMARY');
    console.log('='.repeat(60));
    console.log(`📁 Source: ${IMAGES_DIRECTORY}`);
    console.log(`📊 Total files: ${totalFiles}`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📦 Brands processed: ${Object.keys(organizedFiles).length}`);

    // Vis organisert struktur i Cloudinary
    console.log('\n📂 Cloudinary folder structure:');
    Object.entries(organizedFiles).forEach(([brand, products]) => {
      console.log(`helseriet/brands/${brand}/`);
      Object.keys(products).forEach(product => {
        console.log(`  └── ${product}/`);
      });
    });

    if (failed > 0) {
      console.log('\n❌ Failed uploads:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`   - ${r.brand}/${r.product}/${r.filename}: ${r.error}`);
      });
    }

    console.log('\n🎯 All done! Check Cloudinary and database.');

  } catch (error) {
    console.error('💥 Upload failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();