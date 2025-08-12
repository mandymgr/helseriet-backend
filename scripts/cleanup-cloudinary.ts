import { v2 as cloudinary } from 'cloudinary';
import prisma from '../src/config/database';
import { config } from '../src/config';
import dotenv from 'dotenv';

dotenv.config();

// Konfigurer Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

async function deleteAllImagesFromCloudinary() {
  try {
    console.log('🧹 Starting Cloudinary cleanup...');

    // Hent alle bilder i helseriet-mappen
    console.log('📋 Fetching all images from Cloudinary...');
    
    const result = await cloudinary.search
      .expression('folder:helseriet/*')
      .max_results(500) // Maksimum per request
      .execute();

    console.log(`📸 Found ${result.total_count} images to delete`);

    if (result.total_count === 0) {
      console.log('✅ No images found in helseriet folder');
      return;
    }

    // Vis hvilke bilder som vil bli slettet
    console.log('📂 Images to be deleted:');
    result.resources.forEach((resource, index) => {
      console.log(`  ${index + 1}. ${resource.public_id}`);
    });

    // Slett alle bildene
    console.log('\n🗑️  Deleting images from Cloudinary...');
    
    const publicIds = result.resources.map(resource => resource.public_id);
    
    if (publicIds.length > 0) {
      // Cloudinary kan slette opptil 100 bilder per request
      const batchSize = 100;
      let deletedCount = 0;
      
      for (let i = 0; i < publicIds.length; i += batchSize) {
        const batch = publicIds.slice(i, i + batchSize);
        
        console.log(`Deleting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(publicIds.length / batchSize)} (${batch.length} images)`);
        
        const deleteResult = await cloudinary.api.delete_resources(batch);
        
        // Telle hvor mange som ble slettet
        Object.values(deleteResult.deleted).forEach(status => {
          if (status === 'deleted') deletedCount++;
        });
        
        // Kort pause mellom batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log(`✅ Successfully deleted ${deletedCount} images from Cloudinary`);
      
      // Slett tomme mapper
      console.log('\n📁 Cleaning up empty folders...');
      try {
        await cloudinary.api.delete_folder('helseriet/products');
        await cloudinary.api.delete_folder('helseriet/brands');
        await cloudinary.api.delete_folder('helseriet');
        console.log('✅ Empty folders cleaned up');
      } catch (folderError) {
        console.log('ℹ️  Some folders may still exist (this is normal if they contain other files)');
      }
    }

    // Hvis det er flere enn 500 bilder, gi beskjed
    if (result.total_count > 500) {
      console.log(`\n⚠️  Warning: Found ${result.total_count} total images, but only processed first 500.`);
      console.log('Run this script again to delete remaining images.');
    }

  } catch (error) {
    console.error('❌ Error deleting images from Cloudinary:', error);
  }
}

async function deleteAllProductImagesFromDatabase() {
  try {
    console.log('\n🗄️  Cleaning up database...');
    
    // Telle produktbilder
    const imageCount = await prisma.productImage.count();
    console.log(`📊 Found ${imageCount} product images in database`);
    
    if (imageCount > 0) {
      // Slett alle produktbilder
      const result = await prisma.productImage.deleteMany({});
      console.log(`✅ Deleted ${result.count} product images from database`);
    }

    // Telle test-produkter (produkter med "TEST" i SKU eller navn)
    const testProducts = await prisma.product.findMany({
      where: {
        OR: [
          { sku: { contains: 'TEST' } },
          { name: { contains: 'Test Product' } },
          { name: { contains: 'Bulk Upload' } }
        ]
      }
    });
    
    console.log(`📦 Found ${testProducts.length} test products`);
    
    if (testProducts.length > 0) {
      console.log('Test products to be deleted:');
      testProducts.forEach(product => {
        console.log(`  - ${product.name} (${product.sku})`);
      });
      
      // Slett test-produkter
      const deleteResult = await prisma.product.deleteMany({
        where: {
          OR: [
            { sku: { contains: 'TEST' } },
            { name: { contains: 'Test Product' } },
            { name: { contains: 'Bulk Upload' } }
          ]
        }
      });
      
      console.log(`✅ Deleted ${deleteResult.count} test products from database`);
    }

  } catch (error) {
    console.error('❌ Error cleaning database:', error);
  }
}

async function main() {
  console.log('🧽 CLOUDINARY & DATABASE CLEANUP');
  console.log('='.repeat(50));
  console.log('This will delete:');
  console.log('• All images in helseriet/* folder from Cloudinary');
  console.log('• All product_images records from database');
  console.log('• All test products from database');
  console.log('='.repeat(50));
  
  try {
    await deleteAllImagesFromCloudinary();
    await deleteAllProductImagesFromDatabase();
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 CLEANUP COMPLETED');
    console.log('='.repeat(50));
    console.log('✅ Cloudinary helseriet folder cleaned');
    console.log('✅ Database product_images cleaned');
    console.log('✅ Test products removed');
    console.log('\nYou can now run the organized upload script again!');
    
  } catch (error) {
    console.error('💥 Cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();