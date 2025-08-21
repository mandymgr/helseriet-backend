// @ts-nocheck
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function linkAllBundleImages() {
  console.log('🖼️  Kobler alle bundle-bilder til SYNERGY-pakker...');

  try {
    // Alle bundle-bilder som skal kobles til riktig pakke
    const bundleImageMappings = [
      {
        productName: 'SYNERGY - Hjernekraftpakke',
        imagePath: '/images/bundles/BrainPower_Bundle_TSC.webp',
        altText: 'SYNERGY Hjernekraftpakke - Mental klarhet og kognitiv støtte'
      },
      {
        productName: 'SYNERGY - You Glow Girl-pakke',
        imagePath: '/images/bundles/You-Glow-Girl-Bundle_TSC_2.webp',
        altText: 'SYNERGY You Glow Girl-pakke - Komplett støtte for kvinner'
      },
      {
        productName: 'SYNERGY - Arbeidsmannspakke',
        imagePath: '/images/bundles/Working-Man-Support-Bundle_TSC.webp',
        altText: 'SYNERGY Arbeidsmannspakke - Ultimate støtte for travel profesjonelle'
      },
      {
        productName: 'SYNERGY - Støttepakke for overgangsalderen',
        imagePath: '/images/bundles/Menopause-Support-Bundle_TSC.webp',
        altText: 'SYNERGY Støttepakke for overgangsalderen - Komplett menopausestøtte'
      },
      {
        productName: 'SYNERGY - Humør- og stressbalansepakke',
        imagePath: '/images/bundles/Mood-Stress_Bundle_TSC.webp',
        altText: 'SYNERGY Humør- og stressbalansepakke - Mental balanse og stressresistens'
      },
      {
        productName: 'SYNERGY - Nybegynnerpakke',
        imagePath: '/images/bundles/Beginner-Pack_Bundle_TSC.webp',
        altText: 'SYNERGY Nybegynnerpakke - Grunnleggende daglig ernæring'
      },
      {
        productName: 'SYNERGY - Lang levetid-pakke',
        imagePath: '/images/bundles/Longevity-Bundle.webp',
        altText: 'SYNERGY Lang levetid-pakke - Komplett anti-aging støtte'
      },
      {
        productName: 'SYNERGY - Strålende hudpakke',
        imagePath: '/images/bundles/Radiant-Skin_Bundle_TSC.webp',
        altText: 'SYNERGY Strålende hudpakke - Anti-aging spa-pakke'
      },
      {
        productName: 'SYNERGY - God bedring-pakke',
        imagePath: '/images/bundles/Get-Well-Soon-Bundle_TSC.webp',
        altText: 'SYNERGY God bedring-pakke - Komplett immunstøtte'
      }
    ];

    // Først, slett eksisterende bundle-bilder for å unngå duplikater
    const synergyBundles = await prisma.product.findMany({
      where: {
        name: { contains: 'SYNERGY' },
        isBundle: true
      },
      include: {
        images: true
      }
    });

    for (const bundle of synergyBundles) {
      if (bundle.images.length > 0) {
        console.log(`🗑️  Sletter eksisterende bilder for ${bundle.name}...`);
        await prisma.productImage.deleteMany({
          where: { productId: bundle.id }
        });
      }
    }

    // Koble nye bilder
    for (const mapping of bundleImageMappings) {
      console.log(`📦 Kobler bilde til ${mapping.productName}...`);

      // Finn produktet
      const product = await prisma.product.findFirst({
        where: { name: mapping.productName }
      });

      if (!product) {
        console.log(`❌ Produkt ikke funnet: ${mapping.productName}`);
        continue;
      }

      // Legg til bilde
      const image = await prisma.productImage.create({
        data: {
          productId: product.id,
          url: mapping.imagePath,
          altText: mapping.altText,
          sortOrder: 0,
          imageType: 'FRONT',
          isPrimary: true,
          originalFileName: mapping.imagePath.split('/').pop() || 'bundle-image.webp'
        }
      });

      console.log(`✅ Bilde koblet: ${mapping.productName.replace('SYNERGY - ', '')} → ${image.url}`);
    }

    console.log('🎉 Alle 9 SYNERGY bundle-bilder er koblet!');

    // Vis sluttresultat
    const updatedBundles = await prisma.product.findMany({
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

    console.log('\n📊 Sluttresultat - SYNERGY-pakker med bilder:');
    for (const bundle of updatedBundles) {
      const status = bundle.images.length > 0 ? '✅' : '❌';
      const imageName = bundle.images.length > 0 ? bundle.images[0].url.split('/').pop() || 'unknown' : 'MANGLER BILDE';
      console.log(`${status} ${bundle.name.replace('SYNERGY - ', '')} → ${imageName}`);
    }

  } catch (error) {
    console.error('❌ Feil ved kobling av bundle-bilder:', error);
  } finally {
    await prisma.$disconnect();
  }
}

linkAllBundleImages();