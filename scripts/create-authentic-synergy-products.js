const { PrismaClient } = require('@prisma/client');
const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: 'dtagymjm2',
  api_key: '242923119824396',
  api_secret: 'ZslZ2ch3SnYPGxT3xrWtvQsMkgI'
});

// All 41 authentic Synergy products with original English names
const SYNERGY_PRODUCTS = [
  'Barley Grass Juice Powder',
  'Beet Juice Powder', 
  'Berry Power',
  'Blue Green Algae Kapsler',
  'Blue Green Algae Pulver',
  'Bone Renewal',
  'Cell Protector',
  'Choline Complex',
  'D3 + K2 Complex',
  'Enzyme Power',
  'Eye Protector',
  'Heart Protector',
  'Immune Health',
  'Matcha Power Kapsler',
  'Matcha Power Pulver',
  'Multi Vitamin',
  'Multi Vitamin 60',
  'Organic Superfood',
  'Organic Superfood Pulver',
  'Pure Radiance C Kapsler',
  'Pure Radiance C Pulver',
  'PureNatal',
  'Radiant Mood',
  'Rapid Rescue',
  'Stress Remedy',
  'Super B-Complex',
  'SuperPure Astaxanthin',
  'SuperPure Beta 1,3-Glucan',
  'SuperPure Fucoidan',
  'SuperPure Ginger',
  'SuperPure Grape Seed',
  'SuperPure Milk Thistle',
  'SuperPure Olive',
  'SuperPure Oregano',
  'SuperPure Resveratrol',
  'SuperPure Turmeric',
  'Vita-Min-Balance for Women',
  'Vita-Min-Herb for Men',
  'Vita-Min-Vitality for Men',
  'Wheat Grass Juice Powder',
  'Zinc Complex'
];

const SYNERGY_KIT_PATH = '/Users/mandymarigjervikrygg/Desktop/Helseriet mapper/alle filer helseriet/Synergy kit ';

// Generate product information for Synergy products
const generateSynergyProductInfo = (productName) => {
  // Create slug from product name
  const slug = `synergy-${productName.toLowerCase()
    .replace(/[æøå]/g, (char) => ({ 'æ': 'ae', 'ø': 'o', 'å': 'a' }[char] || char))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;

  // Generate product descriptions based on type
  let description = '';
  let shortDescription = '';
  let price = 0;

  if (productName.includes('Vitamin') || productName.includes('Complex')) {
    description = `${productName} from The Synergy Company - Premium quality vitamin supplement formulated with organic whole food ingredients for optimal bioavailability and effectiveness.`;
    shortDescription = `Premium organic vitamin supplement`;
    price = Math.floor(Math.random() * 200) + 399; // 399-599
  } else if (productName.includes('SuperPure')) {
    description = `${productName} from The Synergy Company - SuperPure extraction technology ensures maximum potency and purity of active compounds in this premium botanical supplement.`;
    shortDescription = `SuperPure botanical extract supplement`;
    price = Math.floor(Math.random() * 300) + 499; // 499-799
  } else if (productName.includes('Juice Powder') || productName.includes('Grass')) {
    description = `${productName} from The Synergy Company - Organic freeze-dried powder preserving all the vital nutrients and enzymes of fresh plants for maximum nutritional benefits.`;
    shortDescription = `Organic freeze-dried superfood powder`;
    price = Math.floor(Math.random() * 250) + 349; // 349-599
  } else if (productName.includes('Protector')) {
    description = `${productName} from The Synergy Company - Advanced protective formula with synergistic nutrients designed to support and protect your body's natural defense systems.`;
    shortDescription = `Advanced protective nutrient formula`;
    price = Math.floor(Math.random() * 300) + 549; // 549-849
  } else if (productName.includes('Power') || productName.includes('Energy')) {
    description = `${productName} from The Synergy Company - Energizing superfood blend with natural compounds to support vitality, stamina and overall wellness naturally.`;
    shortDescription = `Natural energy and vitality support`;
    price = Math.floor(Math.random() * 250) + 399; // 399-649
  } else {
    description = `${productName} from The Synergy Company - Premium nutritional supplement crafted with organic whole food ingredients for optimal health and wellness support.`;
    shortDescription = `Premium whole food nutritional supplement`;
    price = Math.floor(Math.random() * 200) + 449; // 449-649
  }

  return {
    name: `SYNERGY - ${productName}`,
    slug: slug,
    description: description,
    shortDescription: shortDescription,
    price: price,
    comparePrice: Math.floor(price * 1.3), // 30% higher compare price
    isBundle: false,
    isFeatured: Math.random() > 0.8 // 20% chance of being featured
  };
};

// Upload image to Cloudinary
const uploadImageToCloudinary = async (imagePath, productSlug, imageIndex) => {
  try {
    const result = await cloudinary.uploader.upload(imagePath, {
      folder: `helseriet/synergy/${productSlug}`,
      public_id: `image_${imageIndex + 1}`,
      overwrite: true,
      resource_type: 'image',
      format: 'webp',
      quality: 'auto:good',
      transformation: [
        { width: 800, height: 800, crop: 'fit', format: 'webp' }
      ]
    });
    
    return result.secure_url;
  } catch (error) {
    console.error(`Error uploading image ${imagePath}:`, error.message);
    return null;
  }
};

// Get images from product folder
const getProductImages = (productName) => {
  const productPath = path.join(SYNERGY_KIT_PATH, productName);
  
  try {
    if (!fs.existsSync(productPath)) {
      console.warn(`⚠️  Product folder not found: ${productPath}`);
      return [];
    }
    
    const files = fs.readdirSync(productPath);
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png|webp)$/i.test(file) && !file.startsWith('.')
    );
    
    return imageFiles.map(file => path.join(productPath, file));
  } catch (error) {
    console.error(`Error reading product folder ${productName}:`, error.message);
    return [];
  }
};

async function createAuthenticSynergyProducts() {
  console.log('🚀 Creating AUTHENTIC Synergy Product Catalog...');
  console.log('=================================================');
  console.log(`📦 Processing ${SYNERGY_PRODUCTS.length} authentic Synergy products`);
  console.log('🔄 Using original English product names');
  console.log('📸 Uploading all images to Cloudinary with organized structure\\n');

  try {
    // Get or create Synergy category
    let synergyCategory = await prisma.category.findFirst({
      where: { name: 'SYNERGY Supplements' }
    });

    if (!synergyCategory) {
      console.log('📁 Creating SYNERGY Supplements category...');
      synergyCategory = await prisma.category.create({
        data: {
          name: 'SYNERGY Supplements',
          slug: 'synergy-supplements',
          description: 'Premium organic whole food supplements from The Synergy Company'
        }
      });
    }

    let createdProducts = 0;
    let uploadedImages = 0;

    for (const productName of SYNERGY_PRODUCTS) {
      console.log(`\\n📦 Processing: ${productName}`);
      
      const productInfo = generateSynergyProductInfo(productName);
      
      // Check if product already exists
      const existingProduct = await prisma.product.findFirst({
        where: { name: productInfo.name }
      });

      if (existingProduct) {
        console.log(`   ⚠️  Product "${productInfo.name}" already exists, skipping...`);
        continue;
      }

      // Get product images
      const imagePaths = getProductImages(productName);
      
      if (imagePaths.length === 0) {
        console.log(`   ⚠️  No images found for ${productName}, creating product without images...`);
      } else {
        console.log(`   📸 Found ${imagePaths.length} images`);
      }

      try {
        // Create product
        const newProduct = await prisma.product.create({
          data: {
            name: productInfo.name,
            slug: productInfo.slug,
            description: productInfo.description,
            shortDescription: productInfo.shortDescription,
            sku: `SYN-${productName.replace(/[^A-Z0-9]/g, '').substring(0, 8)}-${Date.now().toString().slice(-4)}`,
            price: productInfo.price,
            comparePrice: productInfo.comparePrice,
            costPrice: Math.floor(productInfo.price * 0.6), // 60% cost for premium products
            categoryId: synergyCategory.id,
            isBundle: false,
            isFeatured: productInfo.isFeatured,
            status: 'ACTIVE',
            tags: ['synergy', 'organic', 'whole-food', 'premium', 'usa']
          }
        });

        console.log(`   ✅ Created product: ${productInfo.name}`);
        createdProducts++;

        // Upload and attach images
        for (let i = 0; i < imagePaths.length; i++) {
          const imagePath = imagePaths[i];
          console.log(`   📤 Uploading image ${i + 1}/${imagePaths.length}...`);
          
          const cloudinaryUrl = await uploadImageToCloudinary(imagePath, productInfo.slug, i);
          
          if (cloudinaryUrl) {
            await prisma.productImage.create({
              data: {
                productId: newProduct.id,
                url: cloudinaryUrl,
                altText: `${productInfo.name} - Image ${i + 1}`,
                sortOrder: i,
                imageType: i === 0 ? 'FRONT' : 'GENERAL',
                isPrimary: i === 0
              }
            });
            
            uploadedImages++;
            console.log(`   ✅ Uploaded and connected image ${i + 1}`);
          } else {
            console.log(`   ❌ Failed to upload image ${i + 1}`);
          }
        }

      } catch (error) {
        console.error(`   ❌ Failed to create product "${productName}": ${error.message}`);
      }
    }

    // Final summary
    console.log('\\n🎉 AUTHENTIC SYNERGY CATALOG COMPLETE!');
    console.log('=====================================');
    console.log(`📦 Products created: ${createdProducts}/${SYNERGY_PRODUCTS.length}`);
    console.log(`📸 Images uploaded: ${uploadedImages}`);
    console.log('');

    // Database summary
    const totalProducts = await prisma.product.count();
    const synergyProducts = await prisma.product.count({ 
      where: { categoryId: synergyCategory.id } 
    });
    const totalImages = await prisma.productImage.count();
    
    console.log('📊 FINAL DATABASE SUMMARY:');
    console.log(`   Total products in database: ${totalProducts}`);
    console.log(`   SYNERGY products: ${synergyProducts}`);
    console.log(`   Total product images: ${totalImages}`);
    console.log('');
    console.log('🌟 Ready to showcase authentic Synergy products!');

  } catch (error) {
    console.error('❌ Error creating authentic Synergy products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAuthenticSynergyProducts().catch(console.error);