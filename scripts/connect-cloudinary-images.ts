import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function connectCloudinaryImages() {
  console.log('🔄 Connecting Cloudinary images to products...');
  console.log('============================================\n');

  try {
    // Get the existing product
    const product = await prisma.product.findFirst({
      where: {
        name: { contains: 'SYNERGY - Premium Helse Bundle' }
      },
      include: {
        images: true
      }
    });

    if (!product) {
      console.log('❌ No product found');
      return;
    }

    console.log(`📦 Found product: ${product.name}`);
    console.log(`📸 Current images: ${product.images.length}`);

    // If already has images, skip
    if (product.images.length > 0) {
      console.log('✅ Product already has images, skipping...');
      return;
    }

    // Sample Cloudinary bundle URLs from the check we did
    const bundleImageUrls = [
      'https://res.cloudinary.com/dtagymjm2/image/upload/v1755803094/helseriet/bundles/dmuza1ksdgwbdenpqwwr.webp',
      'https://res.cloudinary.com/dtagymjm2/image/upload/v1755803093/helseriet/bundles/jhcpyx1pdutjylttunmm.webp',
      'https://res.cloudinary.com/dtagymjm2/image/upload/v1755803091/helseriet/bundles/vz0pzzcihz7r8ufkykrh.webp'
    ];

    // Add the first bundle image as main product image
    const imageData = {
      productId: product.id,
      url: bundleImageUrls[0],
      altText: `${product.name} - Produktbilde`,
      sortOrder: 0,
      imageType: 'FRONT' as const,
      isPrimary: true
    };

    await prisma.productImage.create({
      data: imageData
    });

    console.log(`✅ Added primary image: ${imageData.url}`);

    // Add additional images
    for (let i = 1; i < bundleImageUrls.length; i++) {
      const additionalImageData = {
        productId: product.id,
        url: bundleImageUrls[i],
        altText: `${product.name} - Alternativt bilde ${i + 1}`,
        sortOrder: i,
        imageType: 'GENERAL' as const,
        isPrimary: false
      };

      await prisma.productImage.create({
        data: additionalImageData
      });

      console.log(`✅ Added image ${i + 1}: ${additionalImageData.url}`);
    }

    // Verify the update
    const updatedProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: { images: true }
    });

    console.log(`\n🎉 SUCCESS!`);
    console.log(`📦 Product: ${updatedProduct?.name}`);
    console.log(`📸 Total images: ${updatedProduct?.images.length}`);
    console.log('\n📸 Images added:');
    updatedProduct?.images.forEach((img, index) => {
      console.log(`  ${index + 1}. ${img.url}`);
      console.log(`     Type: ${img.imageType}, Primary: ${img.isPrimary}`);
    });

  } catch (error) {
    console.error('❌ Error connecting images:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await connectCloudinaryImages();
}

main().catch(console.error);