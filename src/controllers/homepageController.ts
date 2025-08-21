import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getHomepageConfig = async (req: Request, res: Response): Promise<any> => {
  try {
    const activeConfig = await prisma.homepageConfig.findFirst({
      where: { isActive: true },
      include: {
        featuredProduct: {
          include: {
            images: true,
            category: true
          }
        }
      }
    });

    if (!activeConfig) {
      return res.json({
        featuredProduct: null,
        bundleProducts: [],
        popularProducts: [],
        categoriesConfig: []
      });
    }

    // Get bundle products
    const bundleProductIds = activeConfig.bundleProducts as string[];
    const bundleProducts = bundleProductIds.length > 0 
      ? await prisma.product.findMany({
          where: { id: { in: bundleProductIds } },
          include: { images: true, category: true }
        })
      : [];

    // Get popular products  
    const popularProductIds = activeConfig.popularProducts as string[];
    const popularProducts = popularProductIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: popularProductIds } },
          include: { images: true, category: true }
        })
      : [];

    res.json({
      featuredProduct: activeConfig.featuredProduct,
      bundleProducts,
      popularProducts,
      categoriesConfig: activeConfig.categoriesConfig
    });
  } catch (error) {
    console.error('Error fetching homepage config:', error);
    res.status(500).json({ error: 'Failed to fetch homepage configuration' });
  }
};

export const updateHomepageConfig = async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      featuredProductId,
      bundleProducts,
      popularProducts,
      categoriesConfig
    } = req.body;

    // Deactivate current active config
    await prisma.homepageConfig.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    // Create new active config
    const newConfig = await prisma.homepageConfig.create({
      data: {
        isActive: true,
        featuredProductId: featuredProductId || null,
        bundleProducts: bundleProducts || [],
        popularProducts: popularProducts || [],
        categoriesConfig: categoriesConfig || [],
        createdBy: 'admin' // TODO: Get from auth
      },
      include: {
        featuredProduct: {
          include: {
            images: true,
            category: true
          }
        }
      }
    });

    res.json(newConfig);
  } catch (error) {
    console.error('Error updating homepage config:', error);
    res.status(500).json({ error: 'Failed to update homepage configuration' });
  }
};