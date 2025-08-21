// @ts-nocheck
import { v2 as cloudinary } from 'cloudinary';
import { config } from '../src/config/index';

async function checkExistingImages() {
  console.log('🔍 Sjekker eksisterende bilder i Cloudinary...');
  
  try {
    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
    });

    // Hent alle bilder i helseriet-mappen
    const allResults = await cloudinary.search
      .expression('folder:helseriet/*')
      .sort_by([['created_at', 'desc']])
      .max_results(500)
      .execute();

    console.log(`\n📊 FANT ${allResults.total_count} BILDER I CLOUDINARY!`);
    console.log(`💾 Total størrelse: ${(allResults.resources.reduce((sum, img) => sum + img.bytes, 0) / 1024 / 1024).toFixed(2)} MB`);

    // Gruppe bildene per mappe
    const imagesByFolder = {};
    allResults.resources.forEach(img => {
      const folder = img.public_id.split('/').slice(0, -1).join('/');
      if (!imagesByFolder[folder]) {
        imagesByFolder[folder] = [];
      }
      imagesByFolder[folder].push(img);
    });

    console.log('\n📁 BILDER PER MAPPE:');
    Object.keys(imagesByFolder).forEach(folder => {
      console.log(`   ${folder}: ${imagesByFolder[folder].length} bilder`);
    });

    // Sjekk spesifikt for bundle-bilder
    const bundleImages = allResults.resources.filter(img => 
      img.public_id.includes('bundle') || 
      img.public_id.includes('Bundle') ||
      img.public_id.includes('pack') ||
      img.public_id.includes('Pack')
    );

    if (bundleImages.length > 0) {
      console.log('\n🎒 BUNDLE-BILDER FUNNET:');
      bundleImages.forEach((img, index) => {
        console.log(`   ${index + 1}. ${img.public_id}`);
        console.log(`      URL: ${img.secure_url}`);
      });
    } else {
      console.log('\n🎒 INGEN BUNDLE-BILDER FUNNET');
    }

    // Vis første 20 bilder for oversikt
    console.log('\n🔍 FØRSTE 20 BILDER (nyeste først):');
    allResults.resources.slice(0, 20).forEach((img, index) => {
      const sizeMB = (img.bytes / 1024 / 1024).toFixed(2);
      console.log(`   ${index + 1}. ${img.public_id} (${sizeMB} MB) - ${img.format}`);
    });

    return {
      total: allResults.total_count,
      bundleImages: bundleImages,
      allImages: allResults.resources
    };

  } catch (error) {
    console.error('❌ Feil ved sjekking av Cloudinary:', error.message);
    return { total: 0, bundleImages: [], allImages: [] };
  }
}

checkExistingImages();