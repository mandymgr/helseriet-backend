import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createNybegynnerpakke() {
  console.log('🌱 Creating Nybegynnerpakke bundle...');

  try {
    // Create bundle product
    const bundle = await prisma.product.create({
      data: {
        name: 'SYNERGY - Nybegynnerpakke',
        slug: 'synergy-nybegynnerpakke',
        description: 'En sunn kropp starter med komplett daglig ernæring, og det er derfor denne duoen kombinerer vårt mest grunnleggende multivitamin med vårt signatur-supermatpulver – kjernestøtte fra naturens mest potente ingredienser. Begge er økologiske kilder til næringsstoffer, antioksidanter og protein, som støtter daglig velvære, livlig energi, mental klarhet, et balansert humør, immunhelse og mer.',
        shortDescription: 'Grunnpakke med Økologisk Superfood Pulver og Super B-Complex for daglig velvære',
        sku: 'SYNERGY-NYBEGYNNERPAKKE-BUNDLE',
        price: 900.00, // 90 dollar konvertert til NOK 
        comparePrice: 1000.00, // 100 dollar
        costPrice: 450.00,
        quantity: 25,
        categoryId: 'cmel7d7cj0002fhb5uvk51ru8', // Shakti kategori
        status: 'ACTIVE',
        isActive: true,
        isFeatured: true,
        isBundle: true,
        tags: ['bundle', 'nybegynner', 'grunnlag', 'multivitamin', 'superfood', 'energi', 'økologisk', 'vegansk'],
        metaTitle: 'SYNERGY Nybegynnerpakke - Grunnleggende daglig ernæring',
        metaDescription: 'Perfekt startpakke med superfood pulver og multivitamin for komplett daglig ernæring. Støtter energi og immunhelse.'
      }
    });

    console.log('✅ Created bundle product:', bundle.name);

    // Create bundle items
    const bundleItems = await Promise.all([
      // Organic Superfood Pulver (closest to "Økologisk supermat")
      prisma.bundleItem.create({
        data: {
          bundleId: bundle.id,
          productId: 'cmel7d88i0015fhb5unk1kgiu', // SYNERGY - Organic Superfood Pulver
          quantity: 1,
          discountPercent: 10.00
        }
      }),
      // Super B-Complex (closest to Multi•Vita•Min multivitamin)
      prisma.bundleItem.create({
        data: {
          bundleId: bundle.id,
          productId: 'cmel7d8gd001jfhb5ajktm98s', // SYNERGY - Super B-Complex
          quantity: 1,
          discountPercent: 10.00
        }
      })
    ]);

    console.log(`✅ Created ${bundleItems.length} bundle items`);
    console.log('🎉 Nybegynnerpakke bundle created successfully!');
    
    return bundle;

  } catch (error) {
    console.error('❌ Error creating bundle:', error);
    throw error;
  }
}

createNybegynnerpakke()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });