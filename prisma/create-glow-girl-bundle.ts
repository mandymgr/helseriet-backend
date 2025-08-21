import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createYouGlowGirlBundle() {
  console.log('🌱 Creating You Glow Girl-pakke bundle...');

  try {
    // Create bundle product
    const bundle = await prisma.product.create({
      data: {
        name: 'SYNERGY - You Glow Girl-pakke',
        slug: 'synergy-you-glow-girl-pakke',
        description: 'Denne er for damene! Stå opp og glød med daglige vitaminer og mineraler pluss potente adaptogener og urter for stress og humørbalanse, varig energi og strålende hud.',
        shortDescription: 'Perfekt pakke for kvinner med Vita-Min-Balance, Radiant Mood og SuperPure Astaxanthin',
        sku: 'SYNERGY-YOU-GLOW-GIRL-BUNDLE',
        price: 1188.00, // 118,80 dollar konvertert til NOK
        comparePrice: 1320.00, // 132 dollar
        costPrice: 590.00,
        quantity: 20,
        categoryId: 'cmel7d7cj0002fhb5uvk51ru8', // Shakti kategori
        status: 'ACTIVE',
        isActive: true,
        isFeatured: true,
        isBundle: true,
        tags: ['bundle', 'kvinner', 'glow', 'hud', 'humør', 'energi', 'stress', 'adaptogen', 'astaxanthin', 'vegansk', 'økologisk', 'glutenfri'],
        metaTitle: 'SYNERGY You Glow Girl-pakke - Komplett støtte for kvinner',
        metaDescription: 'Perfekt pakke for kvinner med multivitamin, humørstøtte og hudglow. Daglige vitaminer, adaptogener og antioksidanter for strålende hud.'
      }
    });

    console.log('✅ Created bundle product:', bundle.name);

    // Create bundle items
    const bundleItems = await Promise.all([
      // Vita-Min-Balance for Women
      prisma.bundleItem.create({
        data: {
          bundleId: bundle.id,
          productId: 'cmel7d8sy0025fhb5yqzl1hg8', // SYNERGY - Vita-Min-Balance for Women
          quantity: 1,
          discountPercent: 10.00
        }
      }),
      // Radiant Mood
      prisma.bundleItem.create({
        data: {
          bundleId: bundle.id,
          productId: 'cmel7d8d1001dfhb5a13w4esh', // SYNERGY - Radiant Mood
          quantity: 1,
          discountPercent: 10.00
        }
      }),
      // SuperPure Astaxanthin
      prisma.bundleItem.create({
        data: {
          bundleId: bundle.id,
          productId: 'cmel7d8hf001lfhb5u6bi4kd0', // SYNERGY - SuperPure Astaxanthin
          quantity: 1,
          discountPercent: 10.00
        }
      })
    ]);

    console.log(`✅ Created ${bundleItems.length} bundle items`);
    console.log('🎉 You Glow Girl-pakke bundle created successfully!');
    
    return bundle;

  } catch (error) {
    console.error('❌ Error creating bundle:', error);
    throw error;
  }
}

createYouGlowGirlBundle()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });