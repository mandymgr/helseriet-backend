// @ts-nocheck
import { uploadToCloudinary } from '../src/config/cloudinary';
import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function smartBundleMigration() {
  console.log('🚀 Smart Bundle Migrasjon - Unngår duplikater');
  console.log('==================================================\n');

  try {
    // Konfigurer Cloudinary
    cloudinary.config({
      cloud_name: 'dtagymjm2',
      api_key: '242923119824396',
      api_secret: 'ZslZ2ch3SnYPGxT3xrWtvQsMkgI',
    });

    // 1. Sjekk eksisterende bundle-bilder i Cloudinary
    console.log('🔍 Sjekker eksisterende bilder i Cloudinary...');
    const existingImages = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'helseriet/bundles/',
      max_results: 50
    });

    const existingBundleNames = existingImages.resources.map(img => 
      img.public_id.split('/').pop()
    );

    console.log(`📊 Fant ${existingBundleNames.length} eksisterende bundle-bilder:`);
    existingBundleNames.forEach(name => console.log(`   - ${name}`));

    // 2. Hent alle SYNERGY bundles fra database
    const bundles = await prisma.product.findMany({
      where: {
        name: { contains: 'SYNERGY' },
        isBundle: true
      },
      include: {
        images: true
      }
    });

    console.log(`\n📦 Behandler ${bundles.length} SYNERGY bundles...\n`);

    let uploadedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const bundle of bundles) {
      const bundleName = bundle.name.replace('SYNERGY - ', '');
      console.log(`📦 ${bundleName}`);

      if (bundle.images.length === 0) {
        console.log('   ⚠️  Ingen bilder i database, hopper over\n');
        skippedCount++;
        continue;
      }

      const image = bundle.images[0];
      console.log(`   🖼️  Nåværende: ${image.url}`);

      // Sjekk om allerede på Cloudinary
      if (image.url.includes('cloudinary.com')) {
        console.log('   ✅ Allerede på Cloudinary, hopper over\n');
        skippedCount++;
        continue;
      }

      // Finn original fil
      const localPath = path.join(
        '/Users/mandymarigjervikrygg/Desktop/helseriet-projekt/helseriet-frontend/public',
        image.url
      );

      if (!fs.existsSync(localPath)) {
        console.log(`   ❌ Lokal fil ikke funnet: ${localPath}\n`);
        errorCount++;
        continue;
      }

      // Sjekk for duplikat basert på filnavn
      const fileName = path.basename(image.url, path.extname(image.url));
      const isDuplicate = existingBundleNames.some(existing => 
        existing.includes(fileName) || fileName.includes(existing)
      );

      if (isDuplicate) {
        console.log('   🔄 Ser ut som duplikat eksisterer allerede, hopper over\n');
        skippedCount++;
        continue;
      }

      try {
        // Les og last opp fil
        const imageBuffer = fs.readFileSync(localPath);
        console.log(`   📤 Laster opp (${(imageBuffer.length / 1024).toFixed(1)} KB)...`);

        const result = await uploadToCloudinary(imageBuffer, {
          folder: 'helseriet/bundles',
          public_id: `${fileName}_${Date.now()}`, // Unikt navn
          transformation: [
            { width: 800, height: 800, crop: 'limit' },
            { quality: 'auto' },
            { format: 'auto' }
          ]
        });

        console.log(`   ✅ Opplastet: ${result.secure_url}`);
        console.log(`   📊 Optimert: ${(result.bytes / 1024).toFixed(1)} KB (${result.format})`);
        
        // TODO: Oppdater database med ny URL (når du er klar)
        console.log(`   💾 Klar for database-oppdatering: ${result.secure_url}\n`);
        
        uploadedCount++;

      } catch (error) {
        console.log(`   ❌ Opplasting feilet: ${error.message}\n`);
        errorCount++;
      }
    }

    console.log('📊 MIGRASJONSSTATUS:');
    console.log(`   ✅ Opplastet: ${uploadedCount} nye bilder`);
    console.log(`   ⏭️  Hoppet over: ${skippedCount} bilder`);
    console.log(`   ❌ Feil: ${errorCount} bilder`);
    console.log(`   🔒 Database: IKKE endret (trygg modus)`);

    if (uploadedCount > 0) {
      console.log('\n🎯 NESTE STEG:');
      console.log('1. Sjekk bildene i Cloudinary dashboard');
      console.log('2. Bekreft at alle ser riktige ut');
      console.log('3. Kjør database-oppdatering når klar');
    }

  } catch (error) {
    console.error('❌ Migrasjon feilet:', error);
  } finally {
    await prisma.$disconnect();
  }
}

smartBundleMigration();