import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'vitaminer' },
      update: {},
      create: {
        name: 'Vitaminer',
        slug: 'vitaminer',
        description: 'Essensielle vitaminer for optimal helse',
        isActive: true,
        sortOrder: 1
      }
    }),
    prisma.category.upsert({
      where: { slug: 'mineraler' },
      update: {},
      create: {
        name: 'Mineraler',
        slug: 'mineraler', 
        description: 'Viktige mineraler og sporstoffer',
        isActive: true,
        sortOrder: 2
      }
    }),
    prisma.category.upsert({
      where: { slug: 'omega-3' },
      update: {},
      create: {
        name: 'Omega-3',
        slug: 'omega-3',
        description: 'Omega-3 fettsyrer fra fisk og alger',
        isActive: true,
        sortOrder: 3
      }
    }),
    prisma.category.upsert({
      where: { slug: 'probiotika' },
      update: {},
      create: {
        name: 'Probiotika',
        slug: 'probiotika',
        description: 'Probiotiske bakterier for tarmhelse',
        isActive: true,
        sortOrder: 4
      }
    })
  ]);

  console.log(`✅ Created ${categories.length} categories`);

  // Create products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: 'VIT-D3-5000' },
      update: {},
      create: {
        name: 'Vitamin D3 5000 IU',
        slug: 'vitamin-d3-5000-iu',
        description: 'Høydose vitamin D3 for optimal opptak. Viktig for immunforsvar, benhelse og muskelstyrke.',
        shortDescription: 'Høydose vitamin D3 5000 IU for immunforsvar og benhelse',
        sku: 'VIT-D3-5000',
        price: 299.00,
        comparePrice: 399.00,
        costPrice: 120.00,
        quantity: 50,
        categoryId: categories[0].id, // Vitaminer
        status: 'ACTIVE',
        isActive: true,
        isFeatured: true,
        tags: ['vitamin-d', 'immunforsvar', 'benhelse'],
        metaTitle: 'Vitamin D3 5000 IU - Høykvalitets kosttilskudd',
        metaDescription: 'Kjøp Vitamin D3 5000 IU for optimal helse. Støtter immunforsvar og benhelse. Fri frakt over 500kr.'
      }
    }),
    prisma.product.upsert({
      where: { sku: 'MAG-GLY-400' },
      update: {},
      create: {
        name: 'Magnesium Glycinate 400mg',
        slug: 'magnesium-glycinate-400mg',
        description: 'Magnesiumglysinat er en av de mest biotilgjengelige formene av magnesium. Støtter muskel- og nervefunksjon.',
        shortDescription: 'Biotilgjengelig magnesium for muskler og søvn',
        sku: 'MAG-GLY-400',
        price: 399.00,
        comparePrice: 499.00,
        costPrice: 150.00,
        quantity: 30,
        categoryId: categories[1].id, // Mineraler
        status: 'ACTIVE',
        isActive: true,
        isFeatured: true,
        tags: ['magnesium', 'søvn', 'muskler', 'avslapning'],
        metaTitle: 'Magnesium Glycinate 400mg - Premium kvalitet',
        metaDescription: 'Kjøp magnesium glycinate for bedre søvn og muskelavslapning. Høy biotilgjengelighet.'
      }
    }),
    prisma.product.upsert({
      where: { sku: 'OMEGA3-1000' },
      update: {},
      create: {
        name: 'Omega-3 Premium 1000mg',
        slug: 'omega-3-premium-1000mg',
        description: 'Premium omega-3 fra villfanget fisk. Høy konsentrasjon av EPA og DHA for hjerte- og hjernehelse.',
        shortDescription: 'Premium omega-3 fra villfanget fisk',
        sku: 'OMEGA3-1000',
        price: 599.00,
        comparePrice: 699.00,
        costPrice: 200.00,
        quantity: 25,
        categoryId: categories[2].id, // Omega-3
        status: 'ACTIVE',
        isActive: true,
        isFeatured: true,
        tags: ['omega-3', 'hjertehelse', 'hjernehelse', 'EPA', 'DHA'],
        metaTitle: 'Omega-3 Premium 1000mg - Villfanget fisk',
        metaDescription: 'Premium omega-3 med høy konsentrasjon EPA og DHA. Støtter hjerte og hjernehelse.'
      }
    }),
    prisma.product.upsert({
      where: { sku: 'PROB-50B' },
      update: {},
      create: {
        name: 'Probiotika 50 Milliard',
        slug: 'probiotika-50-milliard',
        description: '12 forskjellige bakteriestammer med 50 milliarder CFU per kapsel. Støtter tarmhelse og immunforsvar.',
        shortDescription: '50 milliarder probiotiske bakterier',
        sku: 'PROB-50B',
        price: 799.00,
        comparePrice: 899.00,
        costPrice: 300.00,
        quantity: 15,
        categoryId: categories[3].id, // Probiotika
        status: 'ACTIVE',
        isActive: true,
        isFeatured: false,
        tags: ['probiotika', 'tarmhelse', 'immunforsvar', 'bakterier'],
        metaTitle: 'Probiotika 50 Milliard - 12 bakteriestammer',
        metaDescription: '50 milliarder probiotiske bakterier for optimal tarmhelse og immunforsvar.'
      }
    })
  ]);

  console.log(`✅ Created ${products.length} products`);

  // Create bundle product
  const healthBundle = await prisma.product.upsert({
    where: { sku: 'SYNERGY-HEALTH-BUNDLE' },
    update: {},
    create: {
      name: 'SYNERGY - Premium Helse Bundle',
      slug: 'synergy-premium-helse-bundle',
      description: 'En komplett pakke med våre mest populære kosttilskudd for optimal helse. Inneholder Vitamin D3, Magnesium, Omega-3 og Probiotika.',
      shortDescription: 'Komplett helsepakke med 4 essensielle kosttilskudd',
      sku: 'SYNERGY-HEALTH-BUNDLE',
      price: 1599.00,
      comparePrice: 1996.00,
      costPrice: 770.00,
      quantity: 10,
      categoryId: categories[0].id, // Vitaminer
      status: 'ACTIVE',
      isActive: true,
      isFeatured: true,
      isBundle: true,
      tags: ['bundle', 'helse', 'komplett', 'besparelse'],
      metaTitle: 'SYNERGY Premium Helse Bundle - 20% besparelse',
      metaDescription: 'Spar 20% på våre beste kosttilskudd. Komplett helsepakke med Vitamin D3, Magnesium, Omega-3 og Probiotika.'
    }
  });

  // Create bundle items
  const bundleItems = await Promise.all([
    prisma.bundleItem.create({
      data: {
        bundleId: healthBundle.id,
        productId: products[0].id, // Vitamin D3
        quantity: 1,
        discountPercent: 20.00
      }
    }),
    prisma.bundleItem.create({
      data: {
        bundleId: healthBundle.id,
        productId: products[1].id, // Magnesium
        quantity: 1,
        discountPercent: 20.00
      }
    }),
    prisma.bundleItem.create({
      data: {
        bundleId: healthBundle.id,
        productId: products[2].id, // Omega-3
        quantity: 1,
        discountPercent: 20.00
      }
    }),
    prisma.bundleItem.create({
      data: {
        bundleId: healthBundle.id,
        productId: products[3].id, // Probiotika
        quantity: 1,
        discountPercent: 20.00
      }
    })
  ]);

  console.log(`✅ Created bundle with ${bundleItems.length} items`);

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@helseriet.no' },
    update: {},
    create: {
      email: 'admin@helseriet.no',
      firstName: 'Admin',
      lastName: 'Helseriet',
      password: hashSync('admin123', 10),
      role: 'SUPER_ADMIN',
      isActive: true,
      isVerified: true
    }
  });

  console.log(`✅ Created admin user: ${adminUser.email}`);

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });