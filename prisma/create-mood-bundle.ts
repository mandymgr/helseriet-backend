import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createMoodStressBundle() {
  console.log('🌱 Creating Humør- og stressbalansepakke bundle...');

  try {
    // Create bundle product
    const bundle = await prisma.product.create({
      data: {
        name: 'SYNERGY - Humør- og stressbalansepakke',
        slug: 'synergy-humor-stressbalansepakke',
        description: 'Hvordan du føler deg mentalt og stressnivået ditt går hånd i hånd. Denne holistiske trioen kombinerer en urteformel for humøret med viktige næringsstoffer som bidrar til å gi næring til binyrene og støtter en stabil tilstand av motstandskraft i både sinn og kropp.',
        shortDescription: 'Holistisk pakke med Radiant Mood, Super B-Complex og Pure Radiance C for humør og stressbalanse',
        sku: 'SYNERGY-HUMOR-STRESS-BUNDLE',
        price: 1044.00, // 104,40 dollar konvertert til NOK
        comparePrice: 1160.00, // 116 dollar
        costPrice: 520.00,
        quantity: 15,
        categoryId: 'cmel7d7cj0002fhb5uvk51ru8', // Shakti kategori
        status: 'ACTIVE',
        isActive: true,
        isFeatured: true,
        isBundle: true,
        tags: ['bundle', 'humør', 'stress', 'mental-helse', 'binyre', 'motstandskraft', 'økologisk', 'vegansk', 'glutenfri'],
        metaTitle: 'SYNERGY Humør- og stressbalansepakke - Mental balanse og stressresistens',
        metaDescription: 'Holistisk pakke med urteformler og næringsstoffer for sunt humør og stressbalanse. Støtter binyrene og mental motstandskraft.'
      }
    });

    console.log('✅ Created bundle product:', bundle.name);

    // Create bundle items
    const bundleItems = await Promise.all([
      // Radiant Mood
      prisma.bundleItem.create({
        data: {
          bundleId: bundle.id,
          productId: 'cmel7d8d1001dfhb5a13w4esh', // SYNERGY - Radiant Mood
          quantity: 1,
          discountPercent: 10.00
        }
      }),
      // Super B-Complex
      prisma.bundleItem.create({
        data: {
          bundleId: bundle.id,
          productId: 'cmel7d8gd001jfhb5ajktm98s', // SYNERGY - Super B-Complex
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
    console.log('🎉 Humør- og stressbalansepakke bundle created successfully!');
    
    return bundle;

  } catch (error) {
    console.error('❌ Error creating bundle:', error);
    throw error;
  }
}

createMoodStressBundle()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });