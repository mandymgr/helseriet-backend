import { v2 as cloudinary } from 'cloudinary';
import { config } from '../src/config';
import dotenv from 'dotenv';

dotenv.config();

// Konfigurer Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

async function checkCloudinaryStatus() {
  try {
    console.log('🔍 Checking Cloudinary status...');
    console.log('Cloud Name:', config.cloudinary.cloudName);
    console.log('API Key:', config.cloudinary.apiKey);
    console.log('');

    // Test 1: Sjekk total antall resources
    console.log('📊 Total resources in account:');
    const allResources = await cloudinary.search
      .max_results(10)
      .execute();
    
    console.log(`Total found: ${allResources.total_count} resources`);
    
    if (allResources.resources.length > 0) {
      console.log('First 10 resources:');
      allResources.resources.forEach((resource, index) => {
        console.log(`  ${index + 1}. ${resource.public_id}`);
      });
    }

    console.log('');

    // Test 2: Sjekk spesifikt helseriet folder
    console.log('🏠 Checking helseriet folder:');
    const helserietResources = await cloudinary.search
      .expression('folder:helseriet/*')
      .max_results(20)
      .execute();

    console.log(`Helseriet resources: ${helserietResources.total_count}`);
    
    if (helserietResources.resources.length > 0) {
      console.log('Helseriet resources:');
      helserietResources.resources.forEach((resource, index) => {
        console.log(`  ${index + 1}. ${resource.public_id}`);
        console.log(`     URL: ${resource.secure_url}`);
      });
    }

    console.log('');

    // Test 3: Sjekk folders structure
    console.log('📁 Checking folder structure:');
    try {
      const folders = await cloudinary.api.sub_folders('helseriet');
      console.log('Helseriet subfolders:');
      folders.folders.forEach((folder, index) => {
        console.log(`  ${index + 1}. ${folder.name}`);
      });

      // Sjekk brands subfolder
      if (folders.folders.some(f => f.name === 'brands')) {
        const brandsFolders = await cloudinary.api.sub_folders('helseriet/brands');
        console.log('Brands subfolders:');
        brandsFolders.folders.forEach((folder, index) => {
          console.log(`  ${index + 1}. ${folder.name}`);
        });
      }
    } catch (folderError) {
      console.log('No folders found or error accessing folders');
    }

    console.log('');

    // Test 4: Sjekk nyeste uploads
    console.log('🕐 Recent uploads:');
    const recentUploads = await cloudinary.search
      .sort_by([['uploaded_at', 'desc']])
      .max_results(10)
      .execute();

    if (recentUploads.resources.length > 0) {
      console.log('Latest uploads:');
      recentUploads.resources.forEach((resource, index) => {
        console.log(`  ${index + 1}. ${resource.public_id}`);
        console.log(`     Uploaded: ${new Date(resource.uploaded_at).toLocaleString()}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking Cloudinary:', error);
    
    if (error.message && error.message.includes('Invalid')) {
      console.log('');
      console.log('🔧 Possible issues:');
      console.log('1. Check your Cloudinary credentials in .env file');
      console.log('2. Verify Cloud Name, API Key, and API Secret');
      console.log('3. Make sure you\'re in the correct Cloudinary account');
    }
  }
}

async function main() {
  console.log('🔍 CLOUDINARY STATUS CHECK');
  console.log('='.repeat(40));
  await checkCloudinaryStatus();
  console.log('='.repeat(40));
}

main();