#!/usr/bin/env node

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Load bundle images data
const bundleImagesPath = path.join(__dirname, '../bundle-images.json');
const bundleImages = JSON.parse(fs.readFileSync(bundleImagesPath, 'utf8'));

// Bundle product definitions with their content and pricing
const bundleDefinitions = {
  'beginner-pack': {
    description: 'Perfect starter bundle for those new to health supplements. Contains essential vitamins and minerals for overall wellness.',
    shortDescription: 'Essential starter supplements bundle',
    bundlePrice: 1299,
    comparePrice: 1699,
    products: [
      // Will be filled with actual product IDs from database
    ]
  },
  'brainpower': {
    description: 'Enhance your cognitive function and mental clarity with this powerful brain-boosting supplement combination.',
    shortDescription: 'Cognitive enhancement supplement bundle',
    bundlePrice: 1499,
    comparePrice: 1899,
    products: []
  },
  'get-well-soon': {
    description: 'Support your immune system and recovery with this carefully selected combination of healing supplements.',
    shortDescription: 'Immune support and recovery bundle',
    bundlePrice: 1199,
    comparePrice: 1599,
    products: []
  },
  'longevity': {
    description: 'Anti-aging and longevity support with premium antioxidants and cellular health supplements.',
    shortDescription: 'Anti-aging and longevity support bundle',
    bundlePrice: 1799,
    comparePrice: 2299,
    products: []
  },
  'menopause-support': {
    description: 'Natural support for women going through menopause with hormone-balancing nutrients.',
    shortDescription: 'Menopause support supplement bundle',
    bundlePrice: 1399,
    comparePrice: 1799,
    products: []
  },
  'mood-stress': {
    description: 'Combat stress and support emotional wellbeing with adaptogens and mood-supporting nutrients.',
    shortDescription: 'Stress relief and mood support bundle',
    bundlePrice: 1249,
    comparePrice: 1649,
    products: []
  },
  'radiant-skin': {
    description: 'Achieve glowing, healthy skin from within with beauty-supporting vitamins and antioxidants.',
    shortDescription: 'Beauty and skin health supplement bundle',
    bundlePrice: 1349,
    comparePrice: 1749,
    products: []
  },
  'working-man-support': {
    description: 'Energy, stamina and overall health support designed for the active working man.',
    shortDescription: 'Men\'s energy and vitality bundle',
    bundlePrice: 1549,
    comparePrice: 1999,
    products: []
  },
  'you-glow-girl': {
    description: 'Complete beauty and wellness bundle for women who want to glow inside and out.',
    shortDescription: 'Women\'s beauty and wellness bundle',
    bundlePrice: 1449,
    comparePrice: 1849,
    products: []
  }
};

async function createBundleProducts() {
  try {
    console.log('🎁 Creating bundle products in database...\n');

    // First, get the SYNERGY category ID
    const synergyCategory = await prisma.category.findFirst({
      where: { slug: 'synergy-supplements' }
    });

    if (!synergyCategory) {
      console.error('❌ SYNERGY category not found');
      return;
    }

    // Get some existing products to add to bundles (we'll use the first few SYNERGY products)
    const existingProducts = await prisma.product.findMany({
      where: {
        categoryId: synergyCategory.id,
        isActive: true,
        isBundle: false
      },
      take: 12,
      select: { id: true, name: true, price: true }
    });

    console.log(`📦 Found ${existingProducts.length} existing products to include in bundles\n`);

    // Create bundle products
    for (const bundleImage of bundleImages) {
      const bundleKey = bundleImage.cleanName;
      const bundleDef = bundleDefinitions[bundleKey];

      if (!bundleDef) {
        console.log(`⚠️  No definition found for bundle: ${bundleKey}`);
        continue;
      }

      console.log(`📤 Creating bundle: ${bundleImage.bundleName}`);

      // Create bundle product
      const bundleProduct = await prisma.product.create({
        data: {
          name: `${bundleImage.bundleName} Bundle`,
          slug: `${bundleKey}-bundle`,
          description: bundleDef.description,
          shortDescription: bundleDef.shortDescription,
          sku: `BUNDLE-${bundleKey.toUpperCase()}`,
          price: bundleDef.bundlePrice,
          comparePrice: bundleDef.comparePrice,
          costPrice: Math.round(bundleDef.bundlePrice * 0.6), // 60% of bundle price
          trackQuantity: false, // Bundles don't track quantity directly
          quantity: 999,
          status: 'ACTIVE',
          isActive: true,
          isFeatured: true,
          isBundle: true,
          tags: ['bundle', 'synergy', 'savings', 'popular'],
          metaTitle: `${bundleImage.bundleName} Bundle - Save on Premium Supplements`,
          metaDescription: `${bundleDef.shortDescription}. Save big with our ${bundleImage.bundleName} bundle package.`,
          categoryId: synergyCategory.id
        }
      });

      // Create bundle image
      await prisma.productImage.create({
        data: {
          productId: bundleProduct.id,
          url: bundleImage.cloudinaryUrl,
          altText: `${bundleImage.bundleName} Bundle - Product Image`,
          sortOrder: 0,
          imageType: 'FRONT',
          isPrimary: true
        }
      });

      // Add 3-4 products to each bundle
      const productsToAdd = existingProducts.slice(0, Math.floor(Math.random() * 2) + 3); // 3-4 products
      let totalBundleValue = 0;

      for (let i = 0; i < productsToAdd.length; i++) {
        const product = productsToAdd[i];
        const quantity = 1;
        const discountPercent = 15 + Math.floor(Math.random() * 10); // 15-25% discount

        await prisma.bundleItem.create({
          data: {
            bundleId: bundleProduct.id,
            productId: product.id,
            quantity,
            discountPercent
          }
        });

        totalBundleValue += Number(product.price) * quantity;
      }

      const savings = totalBundleValue - bundleDef.bundlePrice;

      console.log(`   ✅ Created with ${productsToAdd.length} products`);
      console.log(`   💰 Bundle price: ${bundleDef.bundlePrice} kr (Save ${savings} kr)`);
      console.log(`   🖼️  Image: ${bundleImage.cloudinaryUrl}`);
      console.log('');
    }

    console.log('🎉 All bundle products created successfully!');

    // Show summary
    const bundleCount = await prisma.product.count({
      where: { isBundle: true }
    });

    console.log(`📊 Total bundles in database: ${bundleCount}`);

  } catch (error) {
    console.error('❌ Error creating bundle products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createBundleProducts();