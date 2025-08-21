import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createMenopauseBundle() {
  console.log('🌱 Creating Støttepakke for overgangsalderen bundle...');

  try {
    // Create bundle product
    const bundle = await prisma.product.create({
      data: {
        name: 'SYNERGY - Støttepakke for overgangsalderen',
        slug: 'synergy-stottepakke-overgangsalderen',
        description: 'Menopause og perimenopause er en periode med store hormonelle endringer, noe som betyr at kroppen din trenger dyp daglig næring for å holde seg i balanse. Denne kuraterte pakken gir deg biotilgjengelige essensielle vitaminer pluss målrettet støtte for bein og binyrer, slik at du holder deg sterk, stødig og klar til å omfavne transformasjonen i denne fasen.',
        shortDescription: 'Komplett menopausestøtte med Vita-Min-Balance for Women, Bone Renewal og Stress Remedy',
        sku: 'SYNERGY-MENOPAUSE-SUPPORT-BUNDLE',
        price: 1314.00, // 131,40 dollar konvertert til NOK
        comparePrice: 1460.00, // 146 dollar
        costPrice: 650.00,
        quantity: 12,
        categoryId: 'cmel7d7cj0002fhb5uvk51ru8', // Shakti kategori
        status: 'ACTIVE',
        isActive: true,
        isFeatured: true,
        isBundle: true,
        tags: ['bundle', 'menopause', 'overgangsalder', 'hormoner', 'bein-helse', 'stress', 'kvinnehelse', 'vegansk', 'glutenfri'],
        metaTitle: 'SYNERGY Støttepakke for overgangsalderen - Komplett menopausestøtte',
        metaDescription: 'Kuratert pakke for hormonelle endringer i overgangsalderen. Støtter energi, bein og binyrer for en sterk transformasjon.'
      }
    });

    console.log('✅ Created bundle product:', bundle.name);

    // Create bundle items
    const bundleItems = await Promise.all([
      // Vita-Min-Balance for Women (closest to Vita•Min•Herb® for kvinner)
      prisma.bundleItem.create({
        data: {
          bundleId: bundle.id,
          productId: 'cmel7d8sy0025fhb5yqzl1hg8', // SYNERGY - Vita-Min-Balance for Women
          quantity: 1,
          discountPercent: 10.00
        }
      }),
      // Bone Renewal
      prisma.bundleItem.create({
        data: {
          bundleId: bundle.id,
          productId: 'cmel7d7tj000ffhb58pv0ydhi', // SYNERGY - Bone Renewal
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
    console.log('🎉 Støttepakke for overgangsalderen bundle created successfully!');
    
    return bundle;

  } catch (error) {
    console.error('❌ Error creating bundle:', error);
    throw error;
  }
}

createMenopauseBundle()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });