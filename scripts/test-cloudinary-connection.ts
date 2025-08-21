// @ts-nocheck
import { v2 as cloudinary } from 'cloudinary';
import { config } from '../src/config/index';

async function testCloudinaryConnection() {
  console.log('🧪 Tester Cloudinary-tilkobling...');
  
  try {
    // Konfigurer Cloudinary
    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
    });

    console.log('📋 Cloudinary konfigurasjon:');
    console.log(`   Cloud Name: ${config.cloudinary.cloudName}`);
    console.log(`   API Key: ${config.cloudinary.apiKey ? '✅ Konfigurert' : '❌ Mangler'}`);
    console.log(`   API Secret: ${config.cloudinary.apiSecret ? '✅ Konfigurert' : '❌ Mangler'}`);

    // Test API-tilkobling
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary tilkobling: VELLYKKET!');
    console.log('📊 API respons:', result);

    // List mapper
    const folders = await cloudinary.api.root_folders();
    console.log('📁 Tilgjengelige mapper:');
    folders.folders.forEach((folder, index) => {
      console.log(`   ${index + 1}. ${folder.name} (${folder.path})`);
    });

    // Sjekk helseriet-mappen
    try {
      const helserietFolder = await cloudinary.api.sub_folders('helseriet');
      console.log('📁 Helseriet undermapper:');
      helserietFolder.folders.forEach((folder, index) => {
        console.log(`   ${index + 1}. ${folder.name}`);
      });
    } catch (error) {
      console.log('📁 Helseriet-mappen finnes ikke enda, vil bli opprettet ved første opplasting');
    }

    console.log('\n🎉 Cloudinary er klar for bruk!');
    return true;

  } catch (error) {
    console.error('❌ Cloudinary tilkobling feilet:', error.message);
    return false;
  }
}

testCloudinaryConnection();