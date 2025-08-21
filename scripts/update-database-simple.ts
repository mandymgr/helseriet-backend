// @ts-nocheck
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateDatabaseWithCloudinaryUrls() {
  console.log('🔄 Oppdaterer database med Cloudinary URLer...');
  console.log('=============================================\n');

  try {
    // Mapping av bundle-navn til Cloudinary URLs
    const cloudinaryMappings = {
      'SYNERGY - God bedring-pakke': 'https://res.cloudinary.com/dtagymjm2/image/upload/v1755803082/helseriet/bundles/c21v8bif8qfly7xq02jd.webp',
      'SYNERGY - Strålende hudpakke': 'https://res.cloudinary.com/dtagymjm2/image/upload/v1755803083/helseriet/bundles/chpvnlnhxh0uvtnqj3d1.webp',
      'SYNERGY - Lang levetid-pakke': 'https://res.cloudinary.com/dtagymjm2/image/upload/v1755803085/helseriet/bundles/d2uryxkfifsttapm7v3j.webp',
      'SYNERGY - Nybegynnerpakke': 'https://res.cloudinary.com/dtagymjm2/image/upload/v1755803087/helseriet/bundles/tx7bwvvyfguswd8w9ydk.webp',
      'SYNERGY - Humør- og stressbalansepakke': 'https://res.cloudinary.com/dtagymjm2/image/upload/v1755803089/helseriet/bundles/tkv8vgeqoq2iaizczjga.webp',
      'SYNERGY - Støttepakke for overgangsalderen': 'https://res.cloudinary.com/dtagymjm2/image/upload/v1755803090/helseriet/bundles/sps5gzjvspjpllmrdqfh.webp',
      'SYNERGY - Arbeidsmannspakke': 'https://res.cloudinary.com/dtagymjm2/image/upload/v1755803091/helseriet/bundles/vz0pzzcihz7r8ufkykrh.webp',
      'SYNERGY - You Glow Girl-pakke': 'https://res.cloudinary.com/dtagymjm2/image/upload/v1755803093/helseriet/bundles/jhcpyx1pdutjylttunmm.webp',
      'SYNERGY - Hjernekraftpakke': 'https://res.cloudinary.com/dtagymjm2/image/upload/v1755803094/helseriet/bundles/dmuza1ksdgwbdenpqwwr.webp'
    };

    // Hent alle SYNERGY bundles
    const bundles = await prisma.product.findMany({
      where: {
        name: { contains: 'SYNERGY' },
        isBundle: true
      },
      include: {
        images: true
      }
    });

    console.log(`📦 Oppdaterer ${bundles.length} SYNERGY bundles...\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const bundle of bundles) {
      const bundleName = bundle.name;
      console.log(`📦 ${bundleName.replace('SYNERGY - ', '')}`);

      // Finn Cloudinary URL for denne pakken
      const cloudinaryUrl = cloudinaryMappings[bundleName];
      if (!cloudinaryUrl) {
        console.log('   ❌ Ingen Cloudinary URL funnet, hopper over\n');
        errorCount++;
        continue;
      }

      if (bundle.images.length === 0) {
        console.log('   ⚠️  Ingen bilder i database, hopper over\n');
        skippedCount++;
        continue;
      }

      const currentImage = bundle.images[0];
      console.log(`   🔄 Gammel: ${currentImage.url}`);
      console.log(`   🆕 Ny:     ${cloudinaryUrl}`);

      try {
        // Oppdater image URL i databasen
        await prisma.productImage.update({
          where: {
            id: currentImage.id
          },
          data: {
            url: cloudinaryUrl,
            altText: `${bundleName.replace('SYNERGY - ', '')} - Optimert fra Cloudinary`
          }
        });

        console.log('   ✅ Database oppdatert!\n');
        updatedCount++;

      } catch (error) {
        console.log(`   ❌ Feil ved oppdatering: ${error.message}\n`);
        errorCount++;
      }
    }

    console.log('📊 OPPDATERINGSSTATUS:');
    console.log(`   ✅ Oppdatert: ${updatedCount} pakker`);
    console.log(`   ⏭️  Hoppet over: ${skippedCount} pakker`);
    console.log(`   ❌ Feil: ${errorCount} pakker`);

    if (updatedCount > 0) {
      console.log('\n🎉 MIGRASJON FULLFØRT!');
      console.log('✅ Bundle-bilder lastes nå fra Cloudinary CDN');
      console.log('🚀 Raskere lasting og mindre bundle størrelse');
      console.log('📱 Optimert for alle enheter');
    }

  } catch (error) {
    console.error('❌ Database-oppdatering feilet:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateDatabaseWithCloudinaryUrls();