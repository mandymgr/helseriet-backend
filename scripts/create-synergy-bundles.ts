import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createSynergyBundles() {
  console.log('🎁 Creating SYNERGY bundles...');

  try {
    // Get the Bundles category
    const bundlesCategory = await prisma.category.findUnique({
      where: { slug: 'bundles' }
    });

    if (!bundlesCategory) {
      throw new Error('Bundles category not found');
    }

    // Get existing SYNERGY products to create bundles from
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

    // Bundle definitions based on the screenshots
    const bundles = [
      {
        name: 'SYNERGY - Radiant Skin Bundle',
        slug: 'synergy-radiant-skin-bundle',
        description: 'Strålende hudpakke - Vitaminer og astaxanthinekstrakt for støtte av antioksidanter og kollagen',
        shortDescription: 'Vitaminer og astaxanthinekstrakt for antioksidanter og kollagen',
        originalPrice: 96.00,
        bundlePrice: 86.40,
        sku: 'SYNERGY-BUNDLE-RADIANT-SKIN',
        productKeywords: [
          ['Cell Protector'], // Often contains antioxidants
          ['D3', 'K2'], // Vitamin support
          ['Eye Protector'] // Contains astaxanthin typically
        ]
      },
      {
        name: 'SYNERGY - Longevity Bundle', 
        slug: 'synergy-longevity-bundle',
        description: 'Lang levetid pakke - Målrettede formler for varig øye-, bein-, hjerte- og cellehelse',
        shortDescription: 'Formler for øye-, bein-, hjerte- og cellehelse',
        originalPrice: 176.00,
        bundlePrice: 158.40,
        sku: 'SYNERGY-BUNDLE-LONGEVITY',
        productKeywords: [
          ['Eye Protector'],
          ['Bone Renewal'], 
          ['Heart Protector'],
          ['Cell Protector']
        ]
      },
      {
        name: 'SYNERGY - Get Well Soon Bundle',
        slug: 'synergy-get-well-soon-bundle', 
        description: 'God bedring pakke - Vitamin C, sink og kraftige ekstrakter som økologisk hyllebær',
        shortDescription: 'Vitamin C, sink og kraftige ekstrakter',
        originalPrice: 94.00,
        bundlePrice: 84.60,
        sku: 'SYNERGY-BUNDLE-GET-WELL-SOON',
        productKeywords: [
          ['Immune Health'], // Typically contains Vitamin C and elderberry
          ['D3', 'K2'] // Vitamin and mineral support
        ]
      },
      {
        name: 'SYNERGY - Beginner Bundle',
        slug: 'synergy-beginner-bundle',
        description: 'Nybegynnerpakke - Multivitamin- og supermatpulver for daglig kjernernæring', 
        shortDescription: 'Multivitamin og supermatpulver for kjernernæring',
        originalPrice: 100.00,
        bundlePrice: 90.00,
        sku: 'SYNERGY-BUNDLE-BEGINNER',
        productKeywords: [
          ['Matcha Power'], // Superfood powder
          ['Enzyme Power'] // Digestive support
        ]
      },
      {
        name: 'SYNERGY - Brainpower Bundle',
        slug: 'synergy-brainpower-bundle',
        description: 'Hjernekraftpakke - Vitaliserende matcha grønn te, algekrystaller og essensiell kolin',
        shortDescription: 'Matcha, algekrystaller og kolin for hjernehelse',
        originalPrice: 108.00,
        bundlePrice: 97.20,
        sku: 'SYNERGY-BUNDLE-BRAINPOWER',
        productKeywords: [
          ['Blue Green Algae'], // Algae crystals
          ['Choline Complex'], // Essential choline
          ['Matcha Power'] // Matcha green tea
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

    console.log('\n🎉 All SYNERGY bundles created successfully!');

  } catch (error) {
    console.error('❌ Error creating SYNERGY bundles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSynergyBundles();