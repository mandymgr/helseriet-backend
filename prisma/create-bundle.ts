import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createGodBedringBundle() {
  console.log('🌱 Creating God bedring-pakke bundle...');

  try {
    // Create bundle product
    const bundle = await prisma.product.create({
      data: {
        name: 'SYNERGY - God bedring-pakke',
        slug: 'synergy-god-bedring-pakke',
        description: 'Vitamin C og sink er begge essensielle for å opprettholde et robust immunforsvar mot det som skjer rundt. Kombiner dem med potente bioaktive ingredienser fra immunstøttende urteekstrakter, og du vil virkelig vise den bakterien hvem som er sjefen.',
        shortDescription: 'Komplett immunstøttende pakke med Rapid Rescue, Sinkkompleks og Pure Radiance C',
        sku: 'SYNERGY-GOD-BEDRING-BUNDLE',
        price: 846.00, // 84,60 dollar konvertert til NOK (ca 10 kr per dollar)
        comparePrice: 940.00, // 94 dollar
        costPrice: 400.00,
        quantity: 20,
        categoryId: 'cmel7d7cj0002fhb5uvk51ru8', // Shakti kategori
        status: 'ACTIVE',
        isActive: true,
        isFeatured: true,
        isBundle: true,
        tags: ['bundle', 'immunforsvar', 'god-bedring', 'vitamin-c', 'sink', 'økologisk'],
        metaTitle: 'SYNERGY God bedring-pakke - Komplett immunstøtte',
        metaDescription: 'Spar på komplett immunstøtte med Rapid Rescue, Sinkkompleks og Pure Radiance C. Laget med økologiske ingredienser.'
      }
    });

    console.log('✅ Created bundle product:', bundle.name);

    // Create bundle items
    const bundleItems = await Promise.all([
      // Rapid Rescue
      prisma.bundleItem.create({
        data: {
          bundleId: bundle.id,
          productId: 'cmel7d8e7001ffhb5fjuw6xd2', // Rapid Rescue
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
      // Pure Radiance C Kapsler (choosing capsules over powder)
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
    console.log('🎉 God bedring-pakke bundle created successfully!');
    
    return bundle;

  } catch (error) {
    console.error('❌ Error creating bundle:', error);
    throw error;
  }
}

createGodBedringBundle()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });