// @ts-nocheck
import { v2 as cloudinary } from 'cloudinary';

async function simpleCheck() {
  try {
    cloudinary.config({
      cloud_name: 'dtagymjm2',
      api_key: '242923119824396',
      api_secret: 'ZslZ2ch3SnYPGxT3xrWtvQsMkgI',
    });

    console.log('🔍 Henter liste over alle bilder...');
    
    const result = await cloudinary.api.resources({
      type: 'upload',
      max_results: 100
    });

    console.log(`📊 Totalt: ${result.total_count} bilder`);
    console.log('📋 Første 20 bilder:');
    
    result.resources.forEach((img, index) => {
      if (index < 20) {
        console.log(`   ${index + 1}. ${img.public_id}`);
      }
    });

    return result;
  } catch (error) {
    console.error('Feil:', error);
  }
}

simpleCheck();