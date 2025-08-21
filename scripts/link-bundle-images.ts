import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function linkBundleImages() {
  console.log('🖼️  Kobler bundle-bilder til SYNERGY-pakker...');

  try {
    // Bundle-bilder som skal kobles
    const bundleImages = [
      {
        productName: 'SYNERGY - Lang levetid-pakke',
        productId: 'cmelfcrws0001fh0n3p300efg',
        imagePath: '/images/bundles/Longevity-Bundle.webp',
        altText: 'SYNERGY Lang levetid-pakke - Komplett anti-aging støtte'
      },
      {
        productName: 'SYNERGY - Humør- og stressbalansepakke',
        productId: 'cmelgz8u10001fhzg7tk97x2o',
        imagePath: '/images/bundles/Mood-Stress_Bundle_TSC.webp',
        altText: 'SYNERGY Humør- og stressbalansepakke - Mental balanse'
      },
      {
        productName: 'SYNERGY - God bedring-pakke',
        productId: 'cmelf59pd0001fhu9ch7cou34',
        imagePath: '/images/bundles/get-well-soon-bundle.webp',
        altText: 'SYNERGY God bedring-pakke - Komplett immunstøtte'
      }
    ];

    for (const bundle of bundleImages) {
      console.log(`📦 Kobler bilde til ${bundle.productName}...`);

      // Sjekk om produktet eksisterer
      const product = await prisma.product.findUnique({
        where: { id: bundle.productId }
      });

      if (!product) {
        console.log(`❌ Produkt ikke funnet: ${bundle.productName}`);
        continue;
      }

      // Legg til bilde
      const image = await prisma.productImage.create({
        data: {
          productId: bundle.productId,
          url: bundle.imagePath,
          altText: bundle.altText,
          sortOrder: 0,
          imageType: 'FRONT',
          isPrimary: true,
          originalFileName: bundle.imagePath.split('/').pop() || 'bundle-image.webp'
        }
      });

      console.log(`✅ Bilde koblet til ${bundle.productName}: ${image.url}`);
    }

    console.log('🎉 Alle bundle-bilder er koblet!');

    // Vis oversikt over SYNERGY-pakker med bilder
    const synergyBundles = await prisma.product.findMany({
      where: {
        name: { contains: 'SYNERGY' },
        isBundle: true
      },
      include: {
        images: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log('\n📊 Oversikt over SYNERGY-pakker:');
    for (const bundle of synergyBundles) {
      console.log(`• ${bundle.name.replace('SYNERGY - ', '')} - ${bundle.images.length} bilde(r)`);
    }

  } catch (error) {
    console.error('❌ Feil ved kobling av bundle-bilder:', error);
  } finally {
    await prisma.$disconnect();
  }
}

linkBundleImages();