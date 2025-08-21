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

    // Sjekk helseriet/bundles mappen
    console.log('\n📁 Sjekker helseriet/bundles mappen:');
    try {
      const bundleResults = await cloudinary.search
        .expression('folder:helseriet/bundles')
        .sort_by([['created_at', 'desc']])
        .max_results(100)
        .execute();

      if (bundleResults.total_count > 0) {
        console.log(`   ✅ Fant ${bundleResults.total_count} bilder i bundles-mappen:`);
        bundleResults.resources.forEach((image, index) => {
          console.log(`   ${index + 1}. ${image.public_id} - ${image.secure_url}`);
        });
      } else {
        console.log('   📭 Ingen bilder i bundles-mappen enda');
      }
    } catch (error) {
      console.log('   📭 bundles-mappen eksisterer ikke enda');
    }

    // Sjekk helseriet/products mappen
    console.log('\n📁 Sjekker helseriet/products mappen:');
    try {
      const productResults = await cloudinary.search
        .expression('folder:helseriet/products')
        .sort_by([['created_at', 'desc']])
        .max_results(50)
        .execute();

      if (productResults.total_count > 0) {
        console.log(`   ✅ Fant ${productResults.total_count} bilder i products-mappen`);
        console.log('   🔍 Første 10 bilder:');
        productResults.resources.slice(0, 10).forEach((image, index) => {
          console.log(`   ${index + 1}. ${image.public_id}`);
        });
      } else {
        console.log('   📭 Ingen bilder i products-mappen enda');
      }
    } catch (error) {
      console.log('   📭 products-mappen eksisterer ikke enda');
    }

    // Total oversikt
    const allResults = await cloudinary.search
      .expression('folder:helseriet/*')
      .max_results(500)
      .execute();

    console.log('\n📊 TOTAL OVERSIKT:');
    console.log(`   📁 Totalt bilder i helseriet/: ${allResults.total_count}`);
    console.log(`   💾 Brukt lagringsplass: ${(allResults.resources.reduce((sum, img) => sum + img.bytes, 0) / 1024 / 1024).toFixed(2)} MB`);

    return {
      bundles: bundleResults?.resources || [],
      products: productResults?.resources || [],
      total: allResults.total_count
    };

  } catch (error) {
    console.error('❌ Feil ved sjekking av Cloudinary:', error.message);
    return { bundles: [], products: [], total: 0 };
  }
}

checkExistingImages();