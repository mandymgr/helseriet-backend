import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ImageMapping {
  pattern: string;
  sortOrder: number;
  isPrimary: boolean;
  imageType: 'FRONT' | 'INGREDIENTS';
  description: string;
}

// Bilderekkefølge: PDP → RP → LP → Facts
const IMAGE_MAPPINGS: ImageMapping[] = [
  {
    pattern: 'PDP',
    sortOrder: 0,
    isPrimary: true,
    imageType: 'FRONT',
    description: 'Product Detail Page - Hovedbilde'
  },
  {
    pattern: 'RP',
    sortOrder: 1,
    isPrimary: false,
    imageType: 'FRONT',
    description: 'Right Panel - Produktbilde fra høyre'
  },
  {
    pattern: 'LP',
    sortOrder: 2,
    isPrimary: false,
    imageType: 'FRONT',
    description: 'Left Panel - Produktbilde fra siden'
  },
  {
    pattern: 'Facts',
    sortOrder: 3,
    isPrimary: false,
    imageType: 'INGREDIENTS',
    description: 'Supplement Facts - Næringsstoffinnhold'
  }
];

async function updateProductImages() {
  console.log('🖼️  Starting product image update...');
  
  try {
    // Hent alle SYNERGY produkter
    const synergyProducts = await prisma.product.findMany({
      where: {
        name: {
          contains: 'SYNERGY'
        }
      },
      include: {
        images: true
      }
    });

    console.log(`📦 Found ${synergyProducts.length} SYNERGY products`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const product of synergyProducts) {
      try {
        console.log(`\n🔍 Processing: ${product.name}`);
        
        // Ekstraktér produktnavn for mappe
        const productFolderName = product.name.replace('SYNERGY - ', '');
        const imageBasePath = `/images/brands/synergy/${productFolderName}`;
        const fullImagePath = path.join(process.cwd(), '../helseriet-frontend/public', imageBasePath);

        // Sjekk om mappen eksisterer
        if (!fs.existsSync(fullImagePath)) {
          console.log(`  ⚠️  Mappe ikke funnet: ${fullImagePath}`);
          continue;
        }

        // Les alle bilder i mappen
        const imageFiles = fs.readdirSync(fullImagePath).filter(file => 
          file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg') || file.toLowerCase().endsWith('.png')
        );

        console.log(`  📸 Fant ${imageFiles.length} bilder: ${imageFiles.join(', ')}`);

        // Slett eksisterende bilder for dette produktet
        await prisma.productImage.deleteMany({
          where: { productId: product.id }
        });

        // Legg til nye bilder i riktig rekkefølge
        const imagesToCreate = [];

        for (const mapping of IMAGE_MAPPINGS) {
          // Finn bilde som matcher mønsteret
          const matchingImage = imageFiles.find(file => 
            file.includes(mapping.pattern) || file.toLowerCase().includes(mapping.pattern.toLowerCase())
          );

          if (matchingImage) {
            imagesToCreate.push({
              productId: product.id,
              url: `${imageBasePath}/${matchingImage}`,
              altText: `${product.name} - ${mapping.description}`,
              sortOrder: mapping.sortOrder,
              isPrimary: mapping.isPrimary,
              imageType: mapping.imageType
            });
            
            console.log(`    ✅ ${mapping.pattern}: ${matchingImage} (sortOrder: ${mapping.sortOrder})`);
          } else {
            console.log(`    ❌ ${mapping.pattern}: Ikke funnet`);
          }
        }

        // Opprett bildene i databasen
        if (imagesToCreate.length > 0) {
          await prisma.productImage.createMany({
            data: imagesToCreate
          });
          
          console.log(`  🎉 La til ${imagesToCreate.length} bilder for ${product.name}`);
          updatedCount++;
        } else {
          console.log(`  ⚠️  Ingen bilder å legge til for ${product.name}`);
        }

      } catch (productError) {
        console.error(`  ❌ Feil ved prosessering av ${product.name}:`, productError);
        errorCount++;
      }
    }

    console.log(`\n📊 Oppsummering:`);
    console.log(`  ✅ Oppdaterte produkter: ${updatedCount}`);
    console.log(`  ❌ Feil: ${errorCount}`);
    console.log(`  📦 Totalt produkter: ${synergyProducts.length}`);

  } catch (error) {
    console.error('❌ Kritisk feil:', error);
    throw error;
  }
}

updateProductImages()
  .catch((e) => {
    console.error('❌ Script feilet:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });