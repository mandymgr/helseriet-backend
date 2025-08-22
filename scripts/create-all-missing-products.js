const { PrismaClient } = require('@prisma/client');
const { v2: cloudinary } = require('cloudinary');

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: 'dtagymjm2',
  api_key: '242923119824396',
  api_secret: 'ZslZ2ch3SnYPGxT3xrWtvQsMkgI'
});

// Generate unique product names and slugs
const bundleNames = [
  'SYNERGY - Premium Helse Bundle',
  'SYNERGY - Immunforsvar Bundle',
  'SYNERGY - Energi & Vitalitet Bundle', 
  'SYNERGY - Hjerte & Hjerne Bundle',
  'SYNERGY - Detox & Rens Bundle',
  'SYNERGY - Sport & Performance Bundle',
  'SYNERGY - Kvinner Helse Bundle',
  'SYNERGY - Menn Helse Bundle',
  'SYNERGY - Familie Bundle',
  'SYNERGY - Senior Helse Bundle',
  'SYNERGY - Ungdom Energi Bundle',
  'SYNERGY - Beauty & Wellness Bundle'
];

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
  'SYNERGY - Calcium Bone',
  'SYNERGY - Coenzyme Q10',
  'SYNERGY - Multivitamin Plus',
  'SYNERGY - Fish Oil Capsules',
  'SYNERGY - Green Tea Extract',
  'SYNERGY - Biotin Hair Growth',
  'SYNERGY - Vitamin E Natural',
  'SYNERGY - Selenium Protection',
  'SYNERGY - Chromium Balance',
  'SYNERGY - Ginkgo Biloba Memory',
  'SYNERGY - Rhodiola Stress Relief',
  'SYNERGY - L-Carnitine Fat Burn',
  'SYNERGY - Glucosamine Joint',
  'SYNERGY - Alpha Lipoic Acid'
];

let usedBundleNames = [];
let usedProductNames = [];

const generateUniqueProductInfo = (productId, isBundle = false) => {
  if (isBundle) {
    // Find an unused bundle name
    const availableNames = bundleNames.filter(name => !usedBundleNames.includes(name));
    if (availableNames.length === 0) {
      // Fallback with ID if all names used
      const name = `SYNERGY - Health Bundle ${productId.substring(0, 4).toUpperCase()}`;
      usedBundleNames.push(name);
      return {
        name: name,
        slug: name.toLowerCase()
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
    }
    
    const randomName = availableNames[Math.floor(Math.random() * availableNames.length)];
    usedBundleNames.push(randomName);
    
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
    // Find an unused product name
    const availableNames = productNames.filter(name => !usedProductNames.includes(name));
    if (availableNames.length === 0) {
      // Fallback with ID if all names used
      const name = `SYNERGY - Health Supplement ${productId.substring(0, 4).toUpperCase()}`;
      usedProductNames.push(name);
      return {
        name: name,
        slug: name.toLowerCase()
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
    
    const randomName = availableNames[Math.floor(Math.random() * availableNames.length)];
    usedProductNames.push(randomName);
    
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

async function createAllMissingProducts() {
  console.log('🚀 Creating ALL missing products from Cloudinary images...');
  console.log('=========================================================\n');

  try {
    // Get existing product names to avoid duplicates
    const existingProducts = await prisma.product.findMany({
      select: { name: true }
    });
    
    // Add existing names to used arrays
    existingProducts.forEach(p => {
      if (p.name.includes('Bundle')) {
        usedBundleNames.push(p.name);
      } else {
        usedProductNames.push(p.name);
      }
    });

    console.log(`📋 Found ${existingProducts.length} existing products to avoid duplicating`);

    // Get category
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

    // Get all Cloudinary images
    const result = await cloudinary.search
      .expression('folder:helseriet/*')
      .max_results(500)
      .execute();

    console.log(`📸 Found ${result.total_count} total images in Cloudinary`);

    // Group images by type and product ID
    const bundles = [];
    const products = {};

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
    console.log(`🏷️  Found ${Object.keys(products).length} unique product folders`);
    console.log('');

    let createdProducts = 0;

    // Create bundle products
    console.log('📦 Creating bundle products...');
    for (const bundle of bundles) {
      // Check if product already exists by image URL
      const existingProduct = await prisma.productImage.findFirst({
        where: { url: bundle.url },
        include: { product: true }
      });

      if (existingProduct) {
        console.log(`   ⚠️  Bundle with image already exists, skipping...`);
        continue;
      }

      const productInfo = generateUniqueProductInfo(bundle.id, true);

      try {
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
      } catch (error) {
        console.log(`   ❌ Failed to create bundle: ${error.message}`);
      }
    }

    // Create individual products
    console.log('\n🏷️  Creating individual products...');
    for (const [productId, images] of Object.entries(products)) {
      // Check if product already exists by checking if any image URLs exist
      const existingProduct = await prisma.productImage.findFirst({
        where: { 
          url: { in: images.map(img => img.url) }
        },
        include: { product: true }
      });

      if (existingProduct) {
        console.log(`   ⚠️  Product with images already exists for folder ${productId}, skipping...`);
        continue;
      }

      const productInfo = generateUniqueProductInfo(productId, false);

      try {
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
      } catch (error) {
        console.log(`   ❌ Failed to create product for ${productId}: ${error.message}`);
      }
    }

    // Summary
    console.log('');
    console.log('🎉 ALL MISSING PRODUCTS CREATED!');
    console.log('=================================');
    console.log(`📦 New products created: ${createdProducts}`);
    console.log('');

    // Verify final count
    const totalProducts = await prisma.product.count();
    const totalIndividualProducts = await prisma.product.count({ where: { isBundle: false } });
    const totalBundles = await prisma.product.count({ where: { isBundle: true } });
    const totalImages = await prisma.productImage.count();
    
    console.log('📊 FINAL DATABASE SUMMARY:');
    console.log(`   Total products: ${totalProducts}`);
    console.log(`   Individual products: ${totalIndividualProducts}`);
    console.log(`   Bundles: ${totalBundles}`);
    console.log(`   Total images: ${totalImages}`);
    console.log(`   Images from Cloudinary: ${result.total_count}`);
    console.log('');

    if (totalImages < result.total_count) {
      console.log(`⚠️  Note: ${result.total_count - totalImages} images from Cloudinary are not yet connected to products`);
    }

  } catch (error) {
    console.error('❌ Error creating missing products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAllMissingProducts().catch(console.error);