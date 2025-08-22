const { PrismaClient } = require('@prisma/client');
const { v2: cloudinary } = require('cloudinary');

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: 'dtagymjm2',
  api_key: '242923119824396',
  api_secret: 'ZslZ2ch3SnYPGxT3xrWtvQsMkgI'
});

// Generate product info
const generateProductInfo = (productId, isBundle = false) => {
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
      'SYNERGY - Calcium Bone',
      'SYNERGY - Coenzyme Q10',
      'SYNERGY - Multivitamin Plus',
      'SYNERGY - Fish Oil Capsules',
      'SYNERGY - Green Tea Extract',
      'SYNERGY - Biotin Hair',
      'SYNERGY - Vitamin E Natural',
      'SYNERGY - Selenium Protection',
      'SYNERGY - Chromium Balance'
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

async function createMissingProducts() {
  console.log('🚀 Creating missing products from Cloudinary images...');
  console.log('=======================================================\n');

  try {
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
      const productInfo = generateProductInfo(bundle.id, true);
      
      // Check if product already exists by image URL
      const existingProduct = await prisma.productImage.findFirst({
        where: { url: bundle.url },
        include: { product: true }
      });

      if (existingProduct) {
        console.log(`   ⚠️  Bundle with image already exists, skipping...`);
        continue;
      }

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

      const productInfo = generateProductInfo(productId, false);

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
    console.log('🎉 MISSING PRODUCTS CREATED!');
    console.log('=============================');
    console.log(`📦 New products created: ${createdProducts}`);
    console.log('');

    // Verify final count
    const totalProducts = await prisma.product.count();
    const totalImages = await prisma.productImage.count();
    
    console.log('📊 FINAL DATABASE SUMMARY:');
    console.log(`   Total products: ${totalProducts}`);
    console.log(`   Total images: ${totalImages}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error creating missing products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createMissingProducts().catch(console.error);