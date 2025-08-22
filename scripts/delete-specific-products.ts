import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteSpecificTestProducts() {
  console.log('🗑️  Deleting specific test products...');

  try {
    // List of exact product names to delete
    const productsToDelete = [
      'Omega-3 Premium 1000mg',
      'Probiotika 50 Milliard', 
      'Magnesium Glycinate 400mg',
      'Vitamin D3 5000 IU'
    ];

    for (const productName of productsToDelete) {
      const result = await prisma.product.deleteMany({
        where: {
          name: productName
        }
      });
      
      if (result.count > 0) {
        console.log(`✅ Deleted product: ${productName}`);
      } else {
        console.log(`⚠️  Product not found: ${productName}`);
      }
    }

    console.log('🎉 Completed deletion of specified test products!');
  } catch (error) {
    console.error('❌ Error deleting products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteSpecificTestProducts();