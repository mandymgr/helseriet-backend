import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createStrålendehudBundle() {
  console.log('🌱 Creating Strålende hudpakke bundle...');

  try {
    // Create bundle product
    const bundle = await prisma.product.create({
      data: {
        name: 'SYNERGY - Strålende hudpakke',
        slug: 'synergy-stralende-hudpakke',
        description: 'Denne foryngende pakken er som en spa-dag for huden din takket være unik støtte fra naturens kraftigste antioksidant – astaxanthin – pluss hudpleieprodukter som vitamin C og sink for å støtte sunn hudtone, tekstur og kollagenproduksjon.',
        shortDescription: 'Foryngende hudpakke med SuperPure Astaxanthin, Sinkkompleks og Pure Radiance C',
        sku: 'SYNERGY-STRALENDE-HUD-BUNDLE',
        price: 864.00, // 86,40 dollar konvertert til NOK 
        comparePrice: 960.00, // 96 dollar
        costPrice: 420.00,
        quantity: 15,
        categoryId: 'cmel7d7cj0002fhb5uvk51ru8', // Shakti kategori
        status: 'ACTIVE',
        isActive: true,
        isFeatured: true,
        isBundle: true,
        tags: ['bundle', 'hud', 'anti-aging', 'astaxanthin', 'vitamin-c', 'sink', 'økologisk', 'vegansk'],
        metaTitle: 'SYNERGY Strålende hudpakke - Anti-aging spa-pakke',
        metaDescription: 'Foryngende hudpakke med astaxanthin, vitamin C og sink for sunn hudtone og kollagenproduksjon. Økologisk og vegansk.'
      }
    });

    console.log('✅ Created bundle product:', bundle.name);

    // Create bundle items
    const bundleItems = await Promise.all([
      // SuperPure Astaxanthin
      prisma.bundleItem.create({
        data: {
          bundleId: bundle.id,
          productId: 'cmel7d8hf001lfhb5u6bi4kd0', // SuperPure Astaxanthin
          quantity: 1,
          discountPercent: 10.00
        }
      }),
      // Zinc Complex
      prisma.bundleItem.create({
        data: {
          bundleId: bundle.id,
          productId: 'cmel7d8xj002dfhb5zrrz3uqz', // Zinc Complex
          quantity: 1,
          discountPercent: 10.00
        }
      }),
      // Pure Radiance C Kapsler
      prisma.bundleItem.create({
        data: {
          bundleId: bundle.id,
          productId: 'cmel7d89l0017fhb5igw5dsyk', // Pure Radiance C Kapsler
          quantity: 1,
          discountPercent: 10.00
        }
      })
    ]);

    console.log(`✅ Created ${bundleItems.length} bundle items`);
    console.log('🎉 Strålende hudpakke bundle created successfully!');
    
    return bundle;

  } catch (error) {
    console.error('❌ Error creating bundle:', error);
    throw error;
  }
}

createStrålendehudBundle()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });