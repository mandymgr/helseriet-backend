import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createLangLevetidBundle() {
  console.log('🌱 Creating Lang levetid-pakke bundle...');

  try {
    // Create bundle product
    const bundle = await prisma.product.create({
      data: {
        name: 'SYNERGY - Lang levetid-pakke',
        slug: 'synergy-lang-levetid-pakke',
        description: 'Denne pakken tilbyr kuratert støtte for de som ønsker å forbedre helsen sin. Med essensielle vitaminer, mineraler og spesialiserte botaniske ekstrakter gir den dyp næring til kroppens viktigste systemer, slik at du kan opprettholde et sterkt og ungdommelig grunnlag i mange år fremover.',
        shortDescription: 'Komplett anti-aging pakke med Bone Renewal, Eye Protector, Heart Protector og Cell Protector',
        sku: 'SYNERGY-LANG-LEVETID-BUNDLE',
        price: 1584.00, // 158,40 dollar konvertert til NOK 
        comparePrice: 1760.00, // 176 dollar
        costPrice: 800.00,
        quantity: 10,
        categoryId: 'cmel7d7cj0002fhb5uvk51ru8', // Shakti kategori
        status: 'ACTIVE',
        isActive: true,
        isFeatured: true,
        isBundle: true,
        tags: ['bundle', 'anti-aging', 'longevity', 'komplett-helse', 'bone-health', 'eye-health', 'heart-health', 'cell-health', 'vegansk'],
        metaTitle: 'SYNERGY Lang levetid-pakke - Komplett anti-aging støtte',
        metaDescription: 'Kuratert anti-aging pakke med støtte for bein, øyne, hjerte og celler. Oppretthold ungdommelig helse i mange år fremover.'
      }
    });

    console.log('✅ Created bundle product:', bundle.name);

    // Create bundle items
    const bundleItems = await Promise.all([
      // Bone Renewal
      prisma.bundleItem.create({
        data: {
          bundleId: bundle.id,
          productId: 'cmel7d7tj000ffhb58pv0ydhi', // Bone Renewal
          quantity: 1,
          discountPercent: 10.00
        }
      }),
      // Eye Protector
      prisma.bundleItem.create({
        data: {
          bundleId: bundle.id,
          productId: 'cmel7d7z8000pfhb50l9tkw7k', // Eye Protector
          quantity: 1,
          discountPercent: 10.00
        }
      }),
      // Heart Protector
      prisma.bundleItem.create({
        data: {
          bundleId: bundle.id,
          productId: 'cmel7d80d000rfhb5nzmdpu3p', // Heart Protector
          quantity: 1,
          discountPercent: 10.00
        }
      }),
      // Cell Protector
      prisma.bundleItem.create({
        data: {
          bundleId: bundle.id,
          productId: 'cmel7d7um000hfhb5oc9apiqw', // Cell Protector
          quantity: 1,
          discountPercent: 10.00
        }
      })
    ]);

    console.log(`✅ Created ${bundleItems.length} bundle items`);
    console.log('🎉 Lang levetid-pakke bundle created successfully!');
    
    return bundle;

  } catch (error) {
    console.error('❌ Error creating bundle:', error);
    throw error;
  }
}

createLangLevetidBundle()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });