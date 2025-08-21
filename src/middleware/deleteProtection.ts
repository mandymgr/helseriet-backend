import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ProtectedRequest extends Request {
  body: {
    confirmDelete?: string;
    confirmationCode?: string;
    [key: string]: any;
  };
}

// Generate random confirmation code
function generateConfirmationCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Store confirmation codes temporarily (in production, use Redis or similar)
const confirmationCodes = new Map<string, { code: string, expires: number }>();

export const requireDeleteConfirmation = (operationType: string) => {
  return async (req: ProtectedRequest, res: Response, next: NextFunction) => {
    try {
      const { confirmDelete, confirmationCode } = req.body;
      const userAgent = req.get('User-Agent') || '';
      const isScript = userAgent.includes('node') || userAgent.includes('curl') || !userAgent.includes('Mozilla');
      
      // If this is a script/automation (like our recovery scripts), require special confirmation
      if (isScript) {
        if (confirmDelete !== 'I_UNDERSTAND_THIS_WILL_DELETE_DATA' || confirmationCode !== 'HELSERIET_ADMIN_OVERRIDE') {
          return res.status(403).json({
            error: 'Delete operation blocked for scripts',
            message: 'Automated delete operations require explicit confirmation',
            required: {
              confirmDelete: 'I_UNDERSTAND_THIS_WILL_DELETE_DATA',
              confirmationCode: 'HELSERIET_ADMIN_OVERRIDE'
            }
          });
        }
        
        console.warn(`⚠️  AUTOMATED DELETE OPERATION: ${operationType} by script`);
        return next();
      }
      
      // For regular web requests, use two-step confirmation
      const sessionKey = `${req.ip}-${operationType}`;
      
      if (!confirmationCode) {
        // Step 1: Generate and send confirmation code
        const code = generateConfirmationCode();
        const expires = Date.now() + 300000; // 5 minutes
        
        confirmationCodes.set(sessionKey, { code, expires });
        
        // Log the dangerous operation attempt
        console.warn(`🚨 DELETE ATTEMPT: ${operationType} from ${req.ip}`);
        
        return res.status(400).json({
          error: 'Confirmation required',
          message: `ADVARSEL: Du er i ferd med å utføre en ${operationType} operasjon som kan slette data!`,
          confirmationCode: code,
          instructions: 'Send denne koden tilbake som "confirmationCode" for å bekrefte operasjonen',
          expires: new Date(expires).toISOString()
        });
      }
      
      // Step 2: Verify confirmation code
      const stored = confirmationCodes.get(sessionKey);
      
      if (!stored) {
        return res.status(400).json({
          error: 'No confirmation code found',
          message: 'Confirmation code expired or not found. Please try again.'
        });
      }
      
      if (stored.expires < Date.now()) {
        confirmationCodes.delete(sessionKey);
        return res.status(400).json({
          error: 'Confirmation code expired',
          message: 'Confirmation code has expired. Please try again.'
        });
      }
      
      if (stored.code !== confirmationCode) {
        return res.status(400).json({
          error: 'Invalid confirmation code',
          message: 'Feil bekreftelskode. Vennligst prøv igjen.'
        });
      }
      
      // Code is valid, allow operation and clean up
      confirmationCodes.delete(sessionKey);
      console.warn(`✅ CONFIRMED DELETE: ${operationType} by ${req.ip}`);
      
      next();
      
    } catch (error) {
      console.error('Error in delete protection middleware:', error);
      res.status(500).json({ error: 'Internal server error in delete protection' });
    }
  };
};

export const logDestructiveOperation = (operationType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Count current data before operation
      const beforeCounts = {
        products: await prisma.product.count(),
        categories: await prisma.category.count(),
        images: await prisma.productImage.count(),
        users: await prisma.user.count()
      };
      
      // Store original res.json to intercept response
      const originalJson = res.json;
      res.json = function(data: any) {
        // Log the operation result
        (async () => {
          const afterCounts = {
            products: await prisma.product.count(),
            categories: await prisma.category.count(),
            images: await prisma.productImage.count(),
            users: await prisma.user.count()
          };
          
          const changes = {
            products: afterCounts.products - beforeCounts.products,
            categories: afterCounts.categories - beforeCounts.categories,
            images: afterCounts.images - beforeCounts.images,
            users: afterCounts.users - beforeCounts.users
          };
          
          console.log(`📊 OPERATION: ${operationType}`);
          console.log(`📈 Changes: Products: ${changes.products}, Categories: ${changes.categories}, Images: ${changes.images}, Users: ${changes.users}`);
          console.log(`📊 Total now: Products: ${afterCounts.products}, Categories: ${afterCounts.categories}, Images: ${afterCounts.images}, Users: ${afterCounts.users}`);
        })();
        
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Error in logging middleware:', error);
      next();
    }
  };
};