import { Request, Response, NextFunction } from 'express';
import prisma from '@/config/database';
import { AppError } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';

class ReviewController {
  async getProductReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId } = req.params;
      const { 
        page = 1, 
        limit = 10,
        rating,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      if (!productId) {
        throw new AppError('Product ID is required', 400);
      }

      const skip = (Number(page) - 1) * Number(limit);

      // Build filter conditions
      const where: any = {
        productId,
        // Only show reviews that are verified or public
      };

      if (rating) {
        where.rating = Number(rating);
      }

      const [reviews, totalCount, averageRating] = await Promise.all([
        prisma.review.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: {
            [sortBy as string]: sortOrder
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }),
        prisma.review.count({ where }),
        prisma.review.aggregate({
          where: { productId },
          _avg: { rating: true }
        })
      ]);

      // Calculate rating distribution
      const ratingDistribution = await prisma.review.groupBy({
        by: ['rating'],
        where: { productId },
        _count: { rating: true },
        orderBy: { rating: 'desc' }
      });

      res.status(200).json({
        success: true,
        data: {
          reviews: reviews.map(review => ({
            ...review,
            user: {
              id: review.user.id,
              name: `${review.user.firstName || ''} ${review.user.lastName || ''}`.trim() || 'Anonym'
            }
          })),
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / Number(limit))
          },
          averageRating: averageRating._avg.rating ? Number(averageRating._avg.rating.toFixed(1)) : 0,
          totalReviews: totalCount,
          ratingDistribution: ratingDistribution.map(item => ({
            rating: item.rating,
            count: item._count.rating
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserReviews(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { 
        page = 1, 
        limit = 10,
        productId 
      } = req.query;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const skip = (Number(page) - 1) * Number(limit);

      const where: any = { userId };
      if (productId) {
        where.productId = productId;
      }

      const [reviews, totalCount] = await Promise.all([
        prisma.review.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: {
                  select: { url: true, altText: true },
                  where: { imageType: 'FRONT' },
                  take: 1
                }
              }
            }
          }
        }),
        prisma.review.count({ where })
      ]);

      res.status(200).json({
        success: true,
        data: {
          reviews,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / Number(limit))
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async createReview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { productId } = req.params;
      const { rating, title, comment } = req.body;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      if (!productId || !rating) {
        throw new AppError('Product ID and rating are required', 400);
      }

      if (rating < 1 || rating > 5) {
        throw new AppError('Rating must be between 1 and 5', 400);
      }

      // Check if product exists
      const product = await prisma.product.findUnique({
        where: { id: productId }
      });

      if (!product) {
        throw new AppError('Product not found', 404);
      }

      // Check if user already reviewed this product
      const existingReview = await prisma.review.findUnique({
        where: {
          userId_productId: {
            userId,
            productId
          }
        }
      });

      if (existingReview) {
        throw new AppError('You have already reviewed this product', 400);
      }

      // Check if user has purchased this product (optional verification)
      const hasPurchased = await prisma.orderItem.findFirst({
        where: {
          productId,
          order: {
            userId,
            paymentStatus: 'COMPLETED'
          }
        }
      });

      // Create review
      const review = await prisma.review.create({
        data: {
          userId,
          productId,
          rating: Number(rating),
          title: title?.trim() || null,
          comment: comment?.trim() || null,
          isVerified: !!hasPurchased
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          product: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      res.status(201).json({
        success: true,
        message: 'Review created successfully',
        data: {
          review: {
            ...review,
            user: {
              id: review.user.id,
              name: `${review.user.firstName || ''} ${review.user.lastName || ''}`.trim() || 'Anonym'
            }
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async updateReview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { reviewId } = req.params;
      const { rating, title, comment } = req.body;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      if (!reviewId) {
        throw new AppError('Review ID is required', 400);
      }

      // Find existing review
      const existingReview = await prisma.review.findUnique({
        where: { id: reviewId }
      });

      if (!existingReview) {
        throw new AppError('Review not found', 404);
      }

      // Check ownership
      if (existingReview.userId !== userId) {
        throw new AppError('You can only update your own reviews', 403);
      }

      if (rating && (rating < 1 || rating > 5)) {
        throw new AppError('Rating must be between 1 and 5', 400);
      }

      // Update review
      const updatedReview = await prisma.review.update({
        where: { id: reviewId },
        data: {
          ...(rating && { rating: Number(rating) }),
          ...(title !== undefined && { title: title?.trim() || null }),
          ...(comment !== undefined && { comment: comment?.trim() || null }),
          updatedAt: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          product: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      res.status(200).json({
        success: true,
        message: 'Review updated successfully',
        data: {
          review: {
            ...updatedReview,
            user: {
              id: updatedReview.user.id,
              name: `${updatedReview.user.firstName || ''} ${updatedReview.user.lastName || ''}`.trim() || 'Anonym'
            }
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteReview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { reviewId } = req.params;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      if (!reviewId) {
        throw new AppError('Review ID is required', 400);
      }

      // Find existing review
      const existingReview = await prisma.review.findUnique({
        where: { id: reviewId }
      });

      if (!existingReview) {
        throw new AppError('Review not found', 404);
      }

      // Check ownership (regular users can only delete their own reviews)
      if (existingReview.userId !== userId && req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
        throw new AppError('You can only delete your own reviews', 403);
      }

      // Delete review
      await prisma.review.delete({
        where: { id: reviewId }
      });

      res.status(200).json({
        success: true,
        message: 'Review deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getReviewStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId } = req.params;

      if (!productId) {
        throw new AppError('Product ID is required', 400);
      }

      const [
        totalReviews,
        averageRating,
        ratingDistribution,
        verifiedReviewsCount
      ] = await Promise.all([
        prisma.review.count({ where: { productId } }),
        prisma.review.aggregate({
          where: { productId },
          _avg: { rating: true }
        }),
        prisma.review.groupBy({
          by: ['rating'],
          where: { productId },
          _count: { rating: true },
          orderBy: { rating: 'desc' }
        }),
        prisma.review.count({ 
          where: { 
            productId,
            isVerified: true 
          } 
        })
      ]);

      res.status(200).json({
        success: true,
        data: {
          totalReviews,
          verifiedReviews: verifiedReviewsCount,
          averageRating: averageRating._avg.rating ? Number(averageRating._avg.rating.toFixed(1)) : 0,
          ratingDistribution: ratingDistribution.map(item => ({
            rating: item.rating,
            count: item._count.rating,
            percentage: totalReviews > 0 ? Math.round((item._count.rating / totalReviews) * 100) : 0
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export const reviewController = new ReviewController();
