import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createBundlesCategory(): Promise<any> {
  console.log('📦 Creating Bundles category...');

  try {
    // Check if Bundles category already exists
    const existingCategory = await prisma.category.findUnique({
      where: { slug: 'bundles' }
    });

    if (existingCategory) {
      console.log('✅ Bundles category already exists');
      return existingCategory;
    }

    // Create Bundles category
    const bundlesCategory = await prisma.category.create({
      data: {
        name: 'Bundles',
        slug: 'bundles',
        description: 'Pakketilbud med kombinerte produkter til reduserte priser',
        isActive: true,
        sortOrder: 1 // High priority to show first
      }
    });

    console.log('✅ Bundles category created successfully!');
    console.log(`   ID: ${bundlesCategory.id}`);
    console.log(`   Name: ${bundlesCategory.name}`);
    console.log(`   Slug: ${bundlesCategory.slug}`);

    return bundlesCategory;
  } catch (error) {
    console.error('❌ Error creating Bundles category:', error);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

createBundlesCategory();