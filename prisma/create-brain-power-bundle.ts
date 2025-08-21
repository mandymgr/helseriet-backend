import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createBrainPowerBundle() {
  console.log('🌱 Creating Hjernekraftpakke bundle...');

  try {
    // Create bundle product
    const bundle = await prisma.product.create({
      data: {
        name: 'SYNERGY - Hjernekraftpakke',
        slug: 'synergy-hjernekraftpakke',
        description: 'Denne vitaliserende trioen kombinerer ren fytonæringsstoffkraft fra Klamath Lake-alger og matcha grønn te med essensiell vitaminstøtte fra fermentert kolin for å hjelpe deg å føle deg aktiv og energisk i både kropp og sinn.',
        shortDescription: 'Vitaliserende trio med Choline Complex, Blågrønne alger og Matcha Power for mental klarhet og energi',
        sku: 'SYNERGY-HJERNEKRAFT-BUNDLE',
        price: 972.00, // 97,20 dollar konvertert til NOK
        comparePrice: 1080.00, // 108 dollar
        costPrice: 485.00,
        quantity: 22,
        categoryId: 'cmel7d7cj0002fhb5uvk51ru8', // Shakti kategori
        status: 'ACTIVE',
        isActive: true,
        isFeatured: true,
        isBundle: true,
        tags: ['bundle', 'hjernekraft', 'mental-klarhet', 'fokus', 'energi', 'kolin', 'alger', 'matcha', 'kognitiv', 'nevrotransmitter', 'vegansk', 'økologisk'],
        metaTitle: 'SYNERGY Hjernekraftpakke - Mental klarhet og kognitiv støtte',
        metaDescription: 'Vitaliserende trio for hjernekraft med kolin, blågrønne alger og matcha. Støtter mental klarhet, fokus og kognitiv funksjon.'
      }
    });

    console.log('✅ Created bundle product:', bundle.name);

    // Create bundle items
    const bundleItems = await Promise.all([
      // Choline Complex
      prisma.bundleItem.create({
        data: {
          bundleId: bundle.id,
          productId: 'cmel7d7vo000jfhb59ptombr5', // SYNERGY - Choline Complex
          quantity: 1,
          discountPercent: 10.00
        }
      }),
      // Blue Green Algae Kapsler (choosing capsules for convenience)
      prisma.bundleItem.create({
        data: {
          bundleId: bundle.id,
          productId: 'cmel7d7rb000bfhb53gewts18', // SYNERGY - Blue Green Algae Kapsler
          quantity: 1,
          discountPercent: 10.00
        }
      }),
      // Matcha Power Kapsler (choosing capsules for convenience)
      prisma.bundleItem.create({
        data: {
          bundleId: bundle.id,
          productId: 'cmel7d82p000vfhb50p11w417', // SYNERGY - Matcha Power Kapsler
          quantity: 1,
          discountPercent: 10.00
        }
      })
    ]);

    console.log(`✅ Created ${bundleItems.length} bundle items`);
    console.log('🎉 Hjernekraftpakke bundle created successfully!');
    
    return bundle;

  } catch (error) {
    console.error('❌ Error creating bundle:', error);
    throw error;
  }
}

createBrainPowerBundle()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });