import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_BASE = 'http://localhost:3001/api';
const IMAGES_BASE_PATH = '/Users/mandymarigjervikrygg/Desktop/helseriet-projekt/helseriet-frontend/public/images/brands/synergy';

// Admin credentials for authentication
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

let authToken: string = '';

// Mapping of product names to image folder names
const PRODUCT_IMAGE_MAPPING: { [key: string]: string } = {
  'SYNERGY - Matcha Power Pulver': 'Matcha Power Pulver',
  'SYNERGY - Matcha Power Kapsler': 'Matcha Power Kapsler',
  'SYNERGY - Immune Health': 'Immune Health',
  'SYNERGY - Heart Protector': 'Heart Protector',
  'SYNERGY - Eye Protector': 'Eye Protector',
  'SYNERGY - Enzyme Power': 'Enzyme Power',
  'SYNERGY - D3 + K2 Complex': 'D3 + K2 Complex',
  'SYNERGY - Choline Complex': 'Choline Complex',
  'SYNERGY - Cell Protector': 'Cell Protector',
  'SYNERGY - Bone Renewal': 'Bone Renewal',
  'SYNERGY - Blue Green Algae Pulver': 'Blue Green Algae Pulver',
  'SYNERGY - Blue Green Algae Kapsler': 'Blue Green Algae Kapsler',
  'SYNERGY - Berry Power': 'Berry Power',
  'SYNERGY - Beet Juice Powder': 'Beet Juice Powder',
  'SYNERGY - Barley Grass Juice Powder': 'Barley Grass Juice Powder',
  'SYNERGY - Multi Vitamin': 'Multi Vitamin',
  'SYNERGY - Pure Radiance C Pulver': 'Pure Radiance C Pulver',
  'SYNERGY - SuperPure Turmeric': 'SuperPure Turmeric'
};

interface Product {
  id: string;
  name: string;
}

async function loginAdmin(): Promise<string> {
  console.log('🔑 Authenticating as admin...');
  
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      })
    });

    const result = await response.json() as any;

    if (!result.success) {
      throw new Error(result.message || 'Login failed');
    }

    console.log('✅ Successfully authenticated as admin');
    return result.data.token;
  } catch (error) {
    console.error('❌ Failed to authenticate:', error);
    throw error;
  }
}

async function getProducts(): Promise<Product[]> {
  console.log('Fetching products from API...');
  const response = await fetch(`${API_BASE}/products?limit=50`);
  const data = await response.json() as any;
  
  if (!data.success) {
    throw new Error('Failed to fetch products');
  }
  
  return data.data.products.filter((p: Product) => 
    Object.keys(PRODUCT_IMAGE_MAPPING).includes(p.name)
  );
}

function getImageFiles(folderPath: string): string[] {
  if (!fs.existsSync(folderPath)) {
    console.log(`Folder does not exist: ${folderPath}`);
    return [];
  }
  
  const files = fs.readdirSync(folderPath);
  const imageFiles = files.filter(file => 
    /\.(jpg|jpeg|png|webp)$/i.test(file) && !file.startsWith('.')
  );
  
  // Sort files to have consistent order (LP.jpg first, then alphabetically)
  return imageFiles.sort((a, b) => {
    if (a === 'LP.jpg') return -1;
    if (b === 'LP.jpg') return 1;
    if (a === 'PDP.jpg') return -1;
    if (b === 'PDP.jpg') return 1;
    return a.localeCompare(b);
  });
}

async function uploadImagesToProduct(productId: string, productName: string, imagePaths: string[]): Promise<void> {
  console.log(`Uploading ${imagePaths.length} images to product ${productId}...`);
  
  const formData = new FormData();
  
  // Add all image files to the form data
  for (const imagePath of imagePaths) {
    formData.append('images', fs.createReadStream(imagePath));
  }
  
  try {
    const response = await fetch(`${API_BASE}/products/${productId}/images`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });
    
    const result = await response.json() as any;
    
    if (!response.ok) {
      console.error(`Response status: ${response.status}`);
      console.error(`Response body:`, result);
      throw new Error(result.message || `HTTP ${response.status}: Failed to upload images to product`);
    }
    
    console.log(`✅ Successfully uploaded ${imagePaths.length} images for ${productName}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to upload images for ${productName}:`, error);
    throw error;
  }
}

async function uploadImagesForProduct(product: Product): Promise<void> {
  console.log(`\n--- Processing ${product.name} ---`);
  
  const folderName = PRODUCT_IMAGE_MAPPING[product.name];
  if (!folderName) {
    console.log(`No folder mapping found for ${product.name}`);
    return;
  }
  
  const folderPath = path.join(IMAGES_BASE_PATH, folderName);
  const imageFiles = getImageFiles(folderPath);
  
  if (imageFiles.length === 0) {
    console.log(`No images found in ${folderPath}`);
    return;
  }
  
  console.log(`Found ${imageFiles.length} images: ${imageFiles.join(', ')}`);
  
  // Get full paths for all image files
  const imagePaths = imageFiles.map(filename => path.join(folderPath, filename));
  
  try {
    // Upload all images at once using the API endpoint
    await uploadImagesToProduct(product.id, product.name, imagePaths);
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error) {
    console.error(`❌ Failed to upload images for ${product.name}:`, error);
  }
}

async function main() {
  try {
    console.log('🚀 Starting product image upload process...\n');
    
    // Authenticate as admin
    authToken = await loginAdmin();
    console.log();
    
    // Get products from API
    const products = await getProducts();
    console.log(`Found ${products.length} SYNERGY products to process\n`);
    
    // Process each product
    for (const product of products) {
      await uploadImagesForProduct(product);
    }
    
    console.log('\n✅ Image upload process completed!');
    
  } catch (error) {
    console.error('❌ Error in main process:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}