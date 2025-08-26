import { BaseService } from './base.service';
import { hash, compare } from 'bcryptjs';
import type { User, Address } from '@prisma/client';

interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: Date;
}

interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: Date;
}

interface CreateAddressData {
  type: 'BILLING' | 'SHIPPING';
  firstName: string;
  lastName: string;
  company?: string;
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
}

interface UpdateAddressData extends Partial<CreateAddressData> {}

interface UserWithAddresses extends User {
  addresses?: Address[];
}

export class UserService extends BaseService {
  /**
   * Create new user account
   */
  async createUser(userData: CreateUserData): Promise<User> {
    this.validateRequiredFields(userData, ['email', 'password', 'firstName', 'lastName']);
    
    const { email, password, ...otherData } = userData;

    // Validate email format
    if (!this.isValidEmail(email)) {
      throw this.createValidationError('Invalid email format', 'email');
    }

    // Validate password strength
    if (!this.isValidPassword(password)) {
      throw this.createValidationError(
        'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number',
        'password'
      );
    }

    return this.handleDatabaseOperation(async () => {
      // Check if user already exists
      const existingUser = await this.db.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        throw this.createConflictError('User with this email already exists', 'email');
      }

      // Hash password
      const hashedPassword = await hash(password, 12);

      // Create user
      const user = await this.db.user.create({
        data: {
          ...otherData,
          email: email.toLowerCase(),
          password: hashedPassword,
          isActive: true,
          isVerified: false // Email verification required
        }
      });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    }, 'Failed to create user account');
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string, includeAddresses: boolean = false): Promise<UserWithAddresses> {
    this.validateId(userId, 'User');

    return this.handleDatabaseOperation(async () => {
      const user = await this.ensureExists(
        () => this.db.user.findUnique({
          where: { id: userId },
          include: {
            addresses: includeAddresses
          }
        }),
        'User'
      );

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword as UserWithAddresses;
    }, 'Failed to get user profile');
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    if (!email || !this.isValidEmail(email)) {
      throw this.createValidationError('Valid email is required', 'email');
    }

    return this.handleDatabaseOperation(async () => {
      return this.db.user.findUnique({
        where: { email: email.toLowerCase() }
      });
    }, 'Failed to get user by email');
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updateData: UpdateProfileData): Promise<User> {
    this.validateId(userId, 'User');

    return this.handleDatabaseOperation(async () => {
      // Ensure user exists
      await this.ensureExists(
        () => this.db.user.findUnique({ where: { id: userId } }),
        'User'
      );

      // Update user
      const user = await this.db.user.update({
        where: { id: userId },
        data: updateData
      });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    }, 'Failed to update user profile');
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    this.validateId(userId, 'User');

    if (!currentPassword || !newPassword) {
      throw this.createValidationError('Current password and new password are required');
    }

    if (!this.isValidPassword(newPassword)) {
      throw this.createValidationError(
        'New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number',
        'newPassword'
      );
    }

    return this.handleDatabaseOperation(async () => {
      // Get user with password
      const user = await this.ensureExists(
        () => this.db.user.findUnique({ where: { id: userId } }),
        'User'
      );

      // Verify current password
      const isValidPassword = await compare(currentPassword, user.password);
      if (!isValidPassword) {
        throw this.createValidationError('Current password is incorrect', 'currentPassword');
      }

      // Hash new password
      const hashedPassword = await hash(newPassword, 12);

      // Update password
      await this.db.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });
    }, 'Failed to change password');
  }

  /**
   * Verify user password
   */
  async verifyPassword(userId: string, password: string): Promise<boolean> {
    this.validateId(userId, 'User');

    if (!password) {
      throw this.createValidationError('Password is required');
    }

    return this.handleDatabaseOperation(async () => {
      const user = await this.ensureExists(
        () => this.db.user.findUnique({ where: { id: userId } }),
        'User'
      );

      return compare(password, user.password);
    }, 'Failed to verify password');
  }

  /**
   * Get user addresses
   */
  async getUserAddresses(userId: string): Promise<Address[]> {
    this.validateId(userId, 'User');

    return this.handleDatabaseOperation(async () => {
      // Ensure user exists
      await this.ensureExists(
        () => this.db.user.findUnique({ where: { id: userId } }),
        'User'
      );

      return this.db.address.findMany({
        where: { userId },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' }
        ]
      });
    }, 'Failed to get user addresses');
  }

  /**
   * Create user address
   */
  async createAddress(userId: string, addressData: CreateAddressData): Promise<Address> {
    this.validateId(userId, 'User');
    this.validateRequiredFields(addressData, ['type', 'firstName', 'lastName', 'street', 'city', 'postalCode', 'country']);

    return this.handleDatabaseOperation(async () => {
      // Ensure user exists
      await this.ensureExists(
        () => this.db.user.findUnique({ where: { id: userId } }),
        'User'
      );

      // If this is set as default, unset other default addresses of the same type
      if (addressData.isDefault) {
        await this.db.address.updateMany({
          where: {
            userId,
            type: addressData.type,
            isDefault: true
          },
          data: { isDefault: false }
        });
      }

      return this.db.address.create({
        data: {
          ...addressData,
          userId
        }
      });
    }, 'Failed to create address');
  }

  /**
   * Update user address
   */
  async updateAddress(userId: string, addressId: string, updateData: UpdateAddressData): Promise<Address> {
    this.validateId(userId, 'User');
    this.validateId(addressId, 'Address');

    return this.handleDatabaseOperation(async () => {
      // Ensure address exists and belongs to user
      const existingAddress = await this.ensureExists(
        () => this.db.address.findFirst({
          where: { id: addressId, userId }
        }),
        'Address'
      );

      // If setting as default, unset other default addresses of the same type
      if (updateData.isDefault && updateData.type) {
        await this.db.address.updateMany({
          where: {
            userId,
            type: updateData.type,
            isDefault: true,
            NOT: { id: addressId }
          },
          data: { isDefault: false }
        });
      } else if (updateData.isDefault && !updateData.type) {
        // Use existing address type if not provided in update
        await this.db.address.updateMany({
          where: {
            userId,
            type: existingAddress.type,
            isDefault: true,
            NOT: { id: addressId }
          },
          data: { isDefault: false }
        });
      }

      return this.db.address.update({
        where: { id: addressId },
        data: updateData
      });
    }, 'Failed to update address');
  }

  /**
   * Delete user address
   */
  async deleteAddress(userId: string, addressId: string): Promise<void> {
    this.validateId(userId, 'User');
    this.validateId(addressId, 'Address');

    return this.handleDatabaseOperation(async () => {
      // Ensure address exists and belongs to user
      await this.ensureExists(
        () => this.db.address.findFirst({
          where: { id: addressId, userId }
        }),
        'Address'
      );

      await this.db.address.delete({
        where: { id: addressId }
      });
    }, 'Failed to delete address');
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(userId: string): Promise<void> {
    this.validateId(userId, 'User');

    return this.handleDatabaseOperation(async () => {
      await this.ensureExists(
        () => this.db.user.findUnique({ where: { id: userId } }),
        'User'
      );

      await this.db.user.update({
        where: { id: userId },
        data: { isActive: false }
      });
    }, 'Failed to deactivate user account');
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  private isValidPassword(password: string): boolean {
    // At least 8 characters, one uppercase, one lowercase, one number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }
}

export const userService = new UserService();