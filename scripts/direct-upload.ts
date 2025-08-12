import fs from 'fs';
import path from 'path';
import { uploadToCloudinary } from '../src/config/cloudinary';
import sharp from 'sharp';
import dotenv from 'dotenv';

dotenv.config();

interface UploadResult {
  localPath: string;
  cloudinaryUrl: string;
  cloudinaryPath: string;
  success: boolean;
  error?: string;
}

const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const IMAGES_DIRECTORY = '/Users/mandymarigjervikrygg/Desktop/helseriet-projekt/images';

async function uploadImageDirectly(
  localFilePath: string, 
  relativeCloudinaryPath: string
): Promise<UploadResult> {
  try {
    // Les og prosesser bildet
    const imageBuffer = fs.readFileSync(localFilePath);
    
    const processedBuffer = await sharp(imageBuffer)
      .resize(1200, 1200, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ 
        quality: 85,
        progressive: true 
      })
      .toBuffer();

    // Lag Cloudinary path (fjern filextension fra public_id)
    const filename = path.basename(localFilePath);
    const filenameWithoutExt = filename.replace(/\.[^/.]+$/, "");
    const cloudinaryPublicId = `helseriet/${relativeCloudinaryPath}/${filenameWithoutExt}`;

    // Last opp med eksakt samme mappestruktur
    const uploadResult = await uploadToCloudinary(processedBuffer, {
      folder: `helseriet/${relativeCloudinaryPath}`,
      public_id: filenameWithoutExt,
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto' },
        { format: 'auto' }
      ]
    });

    return {
      localPath: localFilePath,
      cloudinaryUrl: uploadResult.secure_url,
      cloudinaryPath: cloudinaryPublicId,
      success: true
    };

  } catch (error) {
    return {
      localPath: localFilePath,
      cloudinaryUrl: '',
      cloudinaryPath: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function getAllImageFiles(): Array<{localPath: string, relativePath: string}> {
  const imageFiles: Array<{localPath: string, relativePath: string}> = [];
  
  function scanDirectory(currentDir: string) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (stat.isFile()) {
        const ext = path.extname(item).toLowerCase();
        if (SUPPORTED_FORMATS.includes(ext)) {
          const relativePath = path.relative(IMAGES_DIRECTORY, path.dirname(fullPath));
          imageFiles.push({
            localPath: fullPath,
            relativePath: relativePath
          });
        }
      }
    }
  }
  
  scanDirectory(IMAGES_DIRECTORY);
  return imageFiles;
}

async function main() {
  try {
    console.log('🚀 Starting direct Cloudinary upload...');
    console.log(`📁 Source: ${IMAGES_DIRECTORY}`);
    console.log('📂 This will preserve exact folder structure in Cloudinary');
    
    if (!fs.existsSync(IMAGES_DIRECTORY)) {
      throw new Error(`Directory not found: ${IMAGES_DIRECTORY}`);
    }

    // Finn alle bildefiler
    const imageFiles = getAllImageFiles();
    
    if (imageFiles.length === 0) {
      console.log('❌ No supported image files found');
      return;
    }

    console.log(`📸 Found ${imageFiles.length} image files`);
    
    // Vis mappestruktur som vil bli opprettet
    const folders = [...new Set(imageFiles.map(f => f.relativePath))];
    console.log('\n📂 Folder structure to be created in Cloudinary:');
    folders.forEach(folder => {
      const fileCount = imageFiles.filter(f => f.relativePath === folder).length;
      console.log(`  helseriet/${folder} (${fileCount} files)`);
    });

    console.log('\n📤 Starting upload...');
    const results: UploadResult[] = [];
    
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const filename = path.basename(file.localPath);
      
      console.log(`[${i + 1}/${imageFiles.length}] ${file.relativePath}/${filename}`);
      
      const result = await uploadImageDirectly(file.localPath, file.relativePath);
      results.push(result);
      
      if (result.success) {
        console.log(`  ✅ → ${result.cloudinaryUrl}`);
      } else {
        console.log(`  ❌ → Error: ${result.error}`);
      }
      
      // Kort pause for stabilitet
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Sammendrag
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log('\n' + '='.repeat(60));
    console.log('🎉 DIRECT UPLOAD COMPLETED');
    console.log('='.repeat(60));
    console.log(`📊 Total files: ${imageFiles.length}`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📂 Folders created: ${folders.length}`);
    
    console.log('\n📂 Final Cloudinary structure:');
    folders.forEach(folder => {
      const successfulInFolder = results.filter(r => r.success && r.localPath.includes(folder.replace(/\//g, path.sep))).length;
      console.log(`  helseriet/${folder} → ${successfulInFolder} files`);
    });

    if (failed > 0) {
      console.log('\n❌ Failed uploads:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`   - ${path.basename(r.localPath)}: ${r.error}`);
      });
    }

    console.log('\n🎯 Done! Check your Cloudinary dashboard for the organized files.');
    console.log('💡 All images maintain their original folder structure.');

  } catch (error) {
    console.error('💥 Upload failed:', error);
  }
}

main();