import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteSeedProducts() {
  console.log('🗑️  Deleting seed products...');

  try {
    // Delete products created on 2025-08-20 (seed products without images)
    const result = await prisma.product.deleteMany({
      where: {
        createdAt: {
          gte: new Date('2025-08-20T00:00:00.000Z'),
          lt: new Date('2025-08-21T00:00:00.000Z')
        }
      }
    });

    console.log(`✅ Deleted ${result.count} seed products successfully!`);
  } catch (error) {
    console.error('❌ Error deleting seed products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteSeedProducts();