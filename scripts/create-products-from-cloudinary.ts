import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { config } from '../src/config';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

// Sample product names and descriptions based on typical health supplements
const generateProductInfo = (productId: string, isBundle: boolean = false) => {
  if (isBundle) {
    const bundleNames = [
      'SYNERGY - Premium Helse Bundle',
      'SYNERGY - Immunforsvar Bundle',
      'SYNERGY - Energi & Vitalitet Bundle', 
      'SYNERGY - Hjerte & Hjerne Bundle',
      'SYNERGY - Detox & Rens Bundle',
      'SYNERGY - Sport & Performance Bundle',
      'SYNERGY - Kvinner Helse Bundle',
      'SYNERGY - Menn Helse Bundle',
      'SYNERGY - Familie Bundle'
    ];
    
    const randomName = bundleNames[Math.floor(Math.random() * bundleNames.length)];
    
    return {
      name: randomName,
      slug: randomName.toLowerCase()
        .replace(/[æøå]/g, (char) => ({ 'æ': 'ae', 'ø': 'o', 'å': 'a' }[char] || char))
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      description: `En komplett pakke med våre mest populære kosttilskudd for optimal helse. Spar penger ved å kjøpe som bundle.`,
      shortDescription: `Komplett helsepakke med premium kosttilskudd`,
      price: Math.floor(Math.random() * 1000) + 999, // 999-1999
      comparePrice: Math.floor(Math.random() * 500) + 1500, // 1500-2000
      isBundle: true,
      isFeatured: true
    };
  } else {
    // Individual product names
    const productNames = [
      'SYNERGY - Vitamin D3 Complex',
      'SYNERGY - Omega-3 Premium',
      'SYNERGY - Magnesium Advanced', 
      'SYNERGY - Probiotika Plus',
      'SYNERGY - Vitamin C Pure',
      'SYNERGY - B-Complex Energy',
      'SYNERGY - Zinc Immune',
      'SYNERGY - Collagen Beauty',
      'SYNERGY - Turmeric Power',
      'SYNERGY - Ashwagandha Stress',
      'SYNERGY - Iron Women',
      'SYNERGY - Calcium Bone'
    ];
    
    const randomName = productNames[Math.floor(Math.random() * productNames.length)];
    
    return {
      name: randomName,
      slug: randomName.toLowerCase()
        .replace(/[æøå]/g, (char) => ({ 'æ': 'ae', 'ø': 'o', 'å': 'a' }[char] || char))
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
      description: `Premium kvalitet kosttilskudd fra SYNERGY. Produsert under strenge kvalitetskontroller for optimal bioaktivitet og effekt.`,
      shortDescription: `Premium kosttilskudd for optimal helse`,
      price: Math.floor(Math.random() * 400) + 299, // 299-699
      comparePrice: Math.floor(Math.random() * 200) + 400, // 400-600
      isBundle: false,
      isFeatured: Math.random() > 0.7 // 30% chance of being featured
    };
  }
};

async function createProductsFromCloudinary() {
  console.log('🚀 Creating products from Cloudinary images...');
  console.log('===============================================\n');

  try {
    // First, get the category (assuming we have a vitamins category)
    let category = await prisma.category.findFirst({
      where: { name: 'Vitaminer' }
    });

    if (!category) {
      console.log('📁 Creating Vitaminer category...');
      category = await prisma.category.create({
        data: {
          name: 'Vitaminer',
          slug: 'vitaminer',
          description: 'Premium vitaminer og kosttilskudd for optimal helse'
        }
      });
    }

    // Get all Cloudinary images in helseriet folder
    const result = await cloudinary.search
      .expression('folder:helseriet/*')
      .max_results(200)
      .execute();

    console.log(`📸 Found ${result.total_count} images in Cloudinary`);

    // Group images by type and product ID
    const bundles: Array<{url: string, id: string}> = [];
    const products: {[key: string]: Array<{url: string, filename: string}>} = {};

    result.resources.forEach(resource => {
      if (resource.public_id.includes('/bundles/')) {
        bundles.push({
          url: resource.secure_url,
          id: resource.public_id.split('/').pop()
        });
      } else if (resource.public_id.includes('/products/')) {
        const pathParts = resource.public_id.split('/');
        const productId = pathParts[2]; // Extract product ID from path
        const filename = pathParts[3];
        
        if (!products[productId]) {
          products[productId] = [];
        }
        
        products[productId].push({
          url: resource.secure_url,
          filename: filename
        });
      }
    });

    console.log(`📦 Found ${bundles.length} bundle images`);
    console.log(`🏷️  Found ${Object.keys(products).length} unique products`);
    console.log('');

    let createdProducts = 0;

    // Create bundle products
    console.log('📦 Creating bundle products...');
    for (const bundle of bundles) {
      const productInfo = generateProductInfo(bundle.id, true);
      
      // Check if product already exists
      const existingProduct = await prisma.product.findFirst({
        where: { name: productInfo.name }
      });

      if (existingProduct) {
        console.log(`   ⚠️  Bundle "${productInfo.name}" already exists, skipping...`);
        continue;
      }

      const newProduct = await prisma.product.create({
        data: {
          name: productInfo.name,
          slug: productInfo.slug,
          description: productInfo.description,
          shortDescription: productInfo.shortDescription,
          sku: `BUNDLE-${bundle.id.substring(0, 8).toUpperCase()}`,
          price: productInfo.price,
          comparePrice: productInfo.comparePrice,
          costPrice: Math.floor(productInfo.price * 0.4), // 40% cost
          categoryId: category.id,
          isBundle: true,
          isFeatured: productInfo.isFeatured,
          status: 'ACTIVE',
          tags: ['bundle', 'synergy', 'kosttilskudd']
        }
      });

      // Add the bundle image
      await prisma.productImage.create({
        data: {
          productId: newProduct.id,
          url: bundle.url,
          altText: `${productInfo.name} - Produktbilde`,
          sortOrder: 0,
          imageType: 'FRONT',
          isPrimary: true
        }
      });

      console.log(`   ✅ Created bundle: ${productInfo.name}`);
      createdProducts++;
    }

    // Create individual products
    console.log('\n🏷️  Creating individual products...');
    for (const [productId, images] of Object.entries(products)) {
      const productInfo = generateProductInfo(productId, false);
      
      // Check if product already exists by checking if any image URLs exist
      const existingProduct = await prisma.productImage.findFirst({
        where: { 
          url: { in: images.map(img => img.url) }
        },
        include: { product: true }
      });

      if (existingProduct) {
        console.log(`   ⚠️  Product with images already exists, skipping...`);
        continue;
      }

      const newProduct = await prisma.product.create({
        data: {
          name: productInfo.name,
          slug: productInfo.slug,
          description: productInfo.description,
          shortDescription: productInfo.shortDescription,
          sku: `SYNERGY-${productId.substring(0, 8).toUpperCase()}`,
          price: productInfo.price,
          comparePrice: productInfo.comparePrice,
          costPrice: Math.floor(productInfo.price * 0.5), // 50% cost
          categoryId: category.id,
          isBundle: false,
          isFeatured: productInfo.isFeatured,
          status: 'ACTIVE',
          tags: ['synergy', 'kosttilskudd', 'vitamin']
        }
      });

      // Add all product images
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        await prisma.productImage.create({
          data: {
            productId: newProduct.id,
            url: image.url,
            altText: `${productInfo.name} - Bilde ${i + 1}`,
            sortOrder: i,
            imageType: i === 0 ? 'FRONT' : 'GENERAL',
            isPrimary: i === 0
          }
        });
      }

      console.log(`   ✅ Created product: ${productInfo.name} (${images.length} images)`);
      createdProducts++;
    }

    // Summary
    console.log('');
    console.log('🎉 PRODUCTS CREATED SUCCESSFULLY!');
    console.log('================================');
    console.log(`📦 Total products created: ${createdProducts}`);
    console.log(`📸 Images connected: ${result.total_count}`);
    console.log('');

    // Verify by getting total products
    const totalProducts = await prisma.product.count();
    const totalImages = await prisma.productImage.count();
    
    console.log('📊 DATABASE SUMMARY:');
    console.log(`   Products in database: ${totalProducts}`);
    console.log(`   Images in database: ${totalImages}`);
    console.log('');
    console.log('🌐 Ready to test in frontend!');

  } catch (error) {
    console.error('❌ Error creating products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await createProductsFromCloudinary();
}

main().catch(console.error);