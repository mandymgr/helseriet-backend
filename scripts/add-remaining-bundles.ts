import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addRemainingBundles() {
  console.log('🎁 Adding remaining 4 SYNERGY bundles...');

  try {
    // Get the Bundles category
    const bundlesCategory = await prisma.category.findUnique({
      where: { slug: 'bundles' }
    });

    if (!bundlesCategory) {
      throw new Error('Bundles category not found');
    }

    // Get existing SYNERGY products
    const synergyProducts = await prisma.product.findMany({
      where: { name: { contains: 'SYNERGY' } },
      select: { id: true, name: true, price: true }
    });

    console.log(`Found ${synergyProducts.length} SYNERGY products to use in bundles`);
    
    // Helper function to find product by name keywords
    const findProduct = (keywords: string[]) => {
      return synergyProducts.find(p => 
        keywords.some(keyword => 
          p.name.toLowerCase().includes(keyword.toLowerCase())
        )
      );
    };

    // The 4 remaining bundle definitions
    const bundles = [
      {
        name: 'SYNERGY - Mood & Stress Bundle',
        slug: 'synergy-mood-stress-bundle',
        description: 'Humør- og stressbalansepakke - Essensielle vitaminer og potente ekstrakter som safran og lavendel',
        shortDescription: 'Vitaminer og ekstrakter for humør og stressbalanse',
        originalPrice: 116.00,
        bundlePrice: 104.40,
        sku: 'SYNERGY-BUNDLE-MOOD-STRESS',
        productKeywords: [
          ['B', 'Complex'], // Super B-Complex (closest match)
          ['D3', 'K2'], // For mood support
          ['Cell Protector'] // Antioxidant support
        ]
      },
      {
        name: 'SYNERGY - Menopause Support Bundle',
        slug: 'synergy-menopause-support-bundle',
        description: 'Støttepakke for overgangsalderen - Essensielle daglige vitaminer pluss formler for bein- og binyrrehelse',
        shortDescription: 'Vitaminer og støtte for overgangsalderen',
        originalPrice: 146.00,
        bundlePrice: 131.40,
        sku: 'SYNERGY-BUNDLE-MENOPAUSE-SUPPORT',
        productKeywords: [
          ['Bone Renewal'], // Bone health
          ['D3', 'K2'], // Vitamin support
          ['Immune Health'] // General health support
        ]
      },
      {
        name: 'SYNERGY - Working Man Bundle',
        slug: 'synergy-working-man-bundle',
        description: 'Arbeidsmannspakke - Multivitamin for menn pluss energigivende urter og adaptogener',
        shortDescription: 'Multivitamin og energigivende urter for menn',
        originalPrice: 124.00,
        bundlePrice: 111.60,
        sku: 'SYNERGY-BUNDLE-WORKING-MAN',
        productKeywords: [
          ['Matcha Power'], // Energy boost
          ['Enzyme Power'], // Digestive support
          ['Immune Health'] // Overall wellness
        ]
      },
      {
        name: 'SYNERGY - You Glow Girl Bundle',
        slug: 'synergy-you-glow-girl-bundle',
        description: 'You Glow Girl pakke - Energigivende multivitamin for kvinner pluss humør- og hudvennlige ekstrakter',
        shortDescription: 'Multivitamin og hudvennlige ekstrakter for kvinner',
        originalPrice: 132.00,
        bundlePrice: 118.80,
        sku: 'SYNERGY-BUNDLE-YOU-GLOW-GIRL',
        productKeywords: [
          ['Cell Protector'], // Antioxidants for skin
          ['D3', 'K2'], // Vitamin support
          ['Eye Protector'] // Contains astaxanthin for skin health
        ]
      }
    ];

    for (const bundleData of bundles) {
      console.log(`\n📦 Creating bundle: ${bundleData.name}`);

      // Create the bundle product
      const bundle = await prisma.product.create({
        data: {
          name: bundleData.name,
          slug: bundleData.slug,
          description: bundleData.description,
          shortDescription: bundleData.shortDescription,
          sku: bundleData.sku,
          price: bundleData.bundlePrice,
          comparePrice: bundleData.originalPrice,
          categoryId: bundlesCategory.id,
          status: 'ACTIVE',
          isActive: true,
          isBundle: true,
          trackQuantity: false,
          quantity: 0,
          tags: ['bundle', 'synergy', 'pakketilbud']
        }
      });

      console.log(`   ✅ Created bundle: ${bundle.name}`);

      // Find and add products to bundle
      for (const keywords of bundleData.productKeywords) {
        const product = findProduct(keywords);
        
        if (product) {
          await prisma.bundleItem.create({
            data: {
              bundleId: bundle.id,
              productId: product.id,
              quantity: 1
            }
          });

          console.log(`   ➕ Added product: ${product.name}`);
        } else {
          console.log(`   ⚠️  Product not found for keywords: ${keywords.join(', ')}`);
        }
      }
    }

    console.log('\n🎉 All remaining SYNERGY bundles created successfully!');

  } catch (error) {
    console.error('❌ Error creating remaining bundles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addRemainingBundles();