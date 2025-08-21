import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createWorkmanBundle() {
  console.log('🌱 Creating Arbeidsmannspakke bundle...');

  try {
    // Create bundle product
    const bundle = await prisma.product.create({
      data: {
        name: 'SYNERGY - Arbeidsmannspakke',
        slug: 'synergy-arbeidsmannspakke',
        description: 'Denne mektige trioen kombinerer viktige vitaminer og mineraler for menn med kraftige fytonæringsstoffer for å støtte et klart sinn, varig energi og stresslindring – den ultimate trioen for enhver travel profesjonell.',
        shortDescription: 'Ultimate pakke for travel profesjonelle med Vita-Min-Vitality for menn, Matcha Power og Stress Remedy',
        sku: 'SYNERGY-ARBEIDSMANN-BUNDLE',
        price: 1116.00, // 111,60 dollar konvertert til NOK
        comparePrice: 1240.00, // 124 dollar
        costPrice: 560.00,
        quantity: 18,
        categoryId: 'cmel7d7cj0002fhb5uvk51ru8', // Shakti kategori
        status: 'ACTIVE',
        isActive: true,
        isFeatured: true,
        isBundle: true,
        tags: ['bundle', 'arbeidsmann', 'profesjonell', 'energi', 'fokus', 'stress', 'multivitamin', 'matcha', 'adaptogen', 'vegansk', 'økologisk'],
        metaTitle: 'SYNERGY Arbeidsmannspakke - Ultimate støtte for travel profesjonelle',
        metaDescription: 'Kraftig trio med multivitamin, matcha og stressbalanse for klart sinn, varig energi og produktivitet. Perfekt for travel profesjonelle.'
      }
    });

    console.log('✅ Created bundle product:', bundle.name);

    // Create bundle items
    const bundleItems = await Promise.all([
      // Vita-Min-Vitality for Men
      prisma.bundleItem.create({
        data: {
          bundleId: bundle.id,
          productId: 'cmel7d8vb0029fhb5oq2wfmsa', // SYNERGY - Vita-Min-Vitality for Men
          quantity: 1,
          discountPercent: 10.00
        }
      }),
      // Matcha Power Kapsler
      prisma.bundleItem.create({
        data: {
          bundleId: bundle.id,
          productId: 'cmel7d82p000vfhb50p11w417', // SYNERGY - Matcha Power Kapsler
          quantity: 1,
          discountPercent: 10.00
        }
      }),
      // Stress Remedy
      prisma.bundleItem.create({
        data: {
          bundleId: bundle.id,
          productId: 'cmel7d8fa001hfhb5zr6mcrhb', // SYNERGY - Stress Remedy
          quantity: 1,
          discountPercent: 10.00
        }
      })
    ]);

    console.log(`✅ Created ${bundleItems.length} bundle items`);
    console.log('🎉 Arbeidsmannspakke bundle created successfully!');
    
    return bundle;

  } catch (error) {
    console.error('❌ Error creating bundle:', error);
    throw error;
  }
}

createWorkmanBundle()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });