const { PrismaClient } = require('@prisma/client');

async function countProducts() {
  const prisma = new PrismaClient();
  
  try {
    const productCount = await prisma.product.count();
    console.log(`Totalt antall produkter i databasen: ${productCount}`);
    
    // Ekstra info
    const activeProducts = await prisma.product.count({
      where: { isActive: true }
    });
    
    const bundles = await prisma.product.count({
      where: { isBundle: true }
    });
    
    const categories = await prisma.category.count();
    
    console.log(`Aktive produkter: ${activeProducts}`);
    console.log(`Bundles/pakker: ${bundles}`);
    console.log(`Kategorier: ${categories}`);
    
  } catch (error) {
    console.error('Feil ved telling av produkter:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

countProducts();