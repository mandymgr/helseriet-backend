import { v2 as cloudinary } from 'cloudinary';
import { config } from '../src/config';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

async function listImages() {
  try {
    console.log('📸 HELSERIET IMAGES IN CLOUDINARY');
    console.log('='.repeat(60));
    
    const result = await cloudinary.search
      .expression('folder:helseriet/*')
      .max_results(50)
      .execute();

    console.log(`Total images found: ${result.total_count}`);
    console.log('');

    if (result.resources.length === 0) {
      console.log('❌ No images found in helseriet folder');
      return;
    }

    console.log('🔗 Direct image URLs (click to test):');
    console.log('');

    // Grouper bilder etter mappe
    const groupedImages = {};
    
    result.resources.forEach((resource, index) => {
      const pathParts = resource.public_id.split('/');
      const folder = pathParts.slice(0, -1).join('/');
      
      if (!groupedImages[folder]) {
        groupedImages[folder] = [];
      }
      
      groupedImages[folder].push({
        public_id: resource.public_id,
        url: resource.secure_url,
        filename: pathParts[pathParts.length - 1]
      });
    });

    // Vis grupperte bilder
    Object.entries(groupedImages).forEach(([folder, images]) => {
      console.log(`📁 ${folder}/`);
      images.slice(0, 5).forEach((image, index) => {
        console.log(`   ${index + 1}. ${image.filename}`);
        console.log(`      ${image.url}`);
      });
      if (images.length > 5) {
        console.log(`   ... and ${images.length - 5} more images`);
      }
      console.log('');
    });

    console.log('='.repeat(60));
    console.log('💡 TIPS FOR FINDING IMAGES IN CLOUDINARY:');
    console.log('1. Click "Assets" in the left sidebar');
    console.log('2. Look for "Media Library" or "Browse"');
    console.log('3. Search for "helseriet" in the search box');
    console.log('4. Or navigate to folders: helseriet → brands → [brand name]');
    console.log('');
    console.log('🌐 Your Cloudinary Console URL:');
    console.log(`https://console.cloudinary.com/console/c-${config.cloudinary.cloudName}`);

  } catch (error) {
    console.error('❌ Error listing images:', error);
  }
}

listImages();