import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { userService } from '@/services/user.service';

class UserController {
  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const user = await userService.getUserById(userId, true); // include addresses

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const updateData = req.body;
      const user = await userService.updateProfile(userId, updateData);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  async getAddresses(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const addresses = await userService.getUserAddresses(userId);

      res.status(200).json({
        success: true,
        data: addresses
      });
    } catch (error) {
      next(error);
    }
  }

  async createAddress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const addressData = req.body;
      const address = await userService.createAddress(userId, addressData);

      res.status(201).json({
        success: true,
        message: 'Address created successfully',
        data: address
      });
    } catch (error) {
      next(error);
    }
  }

  async updateAddress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { addressId } = req.params;
      
      if (!addressId) {
        throw new Error('Address ID is required');
      }

      const updateData = req.body;
      const address = await userService.updateAddress(userId, addressId, updateData);

      res.status(200).json({
        success: true,
        message: 'Address updated successfully',
        data: address
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAddress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { addressId } = req.params;
      
      if (!addressId) {
        throw new Error('Address ID is required');
      }

      await userService.deleteAddress(userId, addressId);

      res.status(200).json({
        success: true,
        message: 'Address deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();