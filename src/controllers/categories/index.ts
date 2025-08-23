import { Request, Response, NextFunction } from 'express';
import prisma from '@/config/database';
import { AppError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';

class CategoryController {
  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await prisma.category.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          isActive: true,
          sortOrder: true,
          _count: {
            select: { products: true }
          }
        },
        orderBy: { sortOrder: 'asc' }
      });

      res.status(200).json({
        success: true,
        data: { categories }
      });
    } catch (error) {
      next(error);
    }
  }

  async getCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('Category ID er påkrevd', 400);
      }

      const category = await prisma.category.findUnique({
        where: { 
          id,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          isActive: true,
          sortOrder: true,
          products: {
            where: {
              isActive: true,
              status: 'ACTIVE'
            },
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              comparePrice: true,
              images: {
                where: { imageType: 'FRONT' },
                select: { url: true, altText: true },
                take: 1
              }
            },
            orderBy: { name: 'asc' }
          },
          _count: {
            select: { products: true }
          }
        }
      });

      if (!category) {
        throw new AppError('Kategori ikke funnet', 404);
      }

      res.status(200).json({
        success: true,
        data: category
      });
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const {
        name,
        description,
        sortOrder = 0
      } = req.body;

      if (!name) {
        throw new AppError('Category name is required', 400);
      }

      // Generate slug from name
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9æøå\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      // Check if slug exists and make it unique
      let finalSlug = slug;
      let counter = 1;
      while (await prisma.category.findUnique({ where: { slug: finalSlug } })) {
        finalSlug = `${slug}-${counter}`;
        counter++;
      }

      const category = await prisma.category.create({
        data: {
          name,
          slug: finalSlug,
          description,
          sortOrder: Number(sortOrder),
          isActive: true
        }
      });

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: { category }
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        sortOrder,
        isActive
      } = req.body;

      if (!id) {
        throw new AppError('Category ID is required', 400);
      }

      const existingCategory = await prisma.category.findUnique({
        where: { id }
      });

      if (!existingCategory) {
        throw new AppError('Category not found', 404);
      }

      const updateData: any = {};
      
      if (name && name !== existingCategory.name) {
        updateData.name = name;
        // Generate new slug if name changed
        const slug = name
          .toLowerCase()
          .replace(/[^a-z0-9æøå\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();

        let finalSlug = slug;
        let counter = 1;
        while (await prisma.category.findFirst({ 
          where: { 
            slug: finalSlug,
            id: { not: id }
          } 
        })) {
          finalSlug = `${slug}-${counter}`;
          counter++;
        }
        updateData.slug = finalSlug;
      }
      
      if (description !== undefined) updateData.description = description;
      if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder);
      if (isActive !== undefined) updateData.isActive = Boolean(isActive);

      const updatedCategory = await prisma.category.update({
        where: { id },
        data: updateData
      });

      res.status(200).json({
        success: true,
        message: 'Category updated successfully',
        data: { category: updatedCategory }
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('Category ID is required', 400);
      }

      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          _count: {
            select: { products: true }
          }
        }
      });

      if (!category) {
        throw new AppError('Category not found', 404);
      }

      if (category._count.products > 0) {
        throw new AppError('Cannot delete category with associated products', 400);
      }

      await prisma.category.delete({
        where: { id }
      });

      res.status(200).json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

export const categoryController = new CategoryController();
