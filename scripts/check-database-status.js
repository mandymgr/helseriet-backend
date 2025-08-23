const { PrismaClient } = require('@prisma/client');

async function checkDatabaseStatus() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== DATABASE STATUS ===');
    
    // Tell alle tabeller med data
    const tables = [
      { name: 'users', model: 'user' },
      { name: 'categories', model: 'category' },
      { name: 'products', model: 'product' },
      { name: 'product_images', model: 'productImage' },
      { name: 'bundle_items', model: 'bundleItem' },
      { name: 'orders', model: 'order' },
      { name: 'order_items', model: 'orderItem' },
      { name: 'carts', model: 'cart' },
      { name: 'cart_items', model: 'cartItem' },
      { name: 'reviews', model: 'review' },
      { name: 'wishlists', model: 'wishlist' },
      { name: 'payments', model: 'payment' },
      { name: 'shipments', model: 'shipment' },
      { name: 'addresses', model: 'address' },
      { name: 'homepage_configs', model: 'homepageConfig' },
      { name: 'refresh_tokens', model: 'refreshToken' },
      { name: 'password_reset_tokens', model: 'passwordResetToken' }
    ];
    
    for (const table of tables) {
      try {
        const count = await prisma[table.model].count();
        console.log(`${table.name.padEnd(25)} : ${count.toString().padStart(3)} records`);
      } catch (error) {
        console.log(`${table.name.padEnd(25)} : ERROR - ${error.message}`);
      }
    }
    
    console.log('\n=== DETAILED PRODUCT INFO ===');
    const productsByCategory = await prisma.product.groupBy({
      by: ['categoryId'],
      _count: { id: true },
      include: {
        category: true
      }
    });
    
    console.log('Products by category:', productsByCategory);
    
    console.log('\n=== SAMPLE PRODUCTS ===');
    const sampleProducts = await prisma.product.findMany({
      take: 3,
      include: {
        category: true,
        images: true
      }
    });
    
    sampleProducts.forEach(product => {
      console.log(`- ${product.name} (${product.category.name}) - ${product.images.length} images`);
    });
    
  } catch (error) {
    console.error('Database check failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseStatus();