import { describe, it, expect, beforeEach } from '@jest/globals';
import { userService } from '@/services/user.service';
import { prisma } from '../../setup';
import { hash } from 'bcryptjs';

describe('UserService', () => {
  let testUser: any;

  beforeEach(async () => {
    // Clean up existing test data
    await prisma.address.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123',
        firstName: 'Test',
        lastName: 'User',
        phone: '+47 123 45 678'
      };

      const user = await userService.createUser(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);
      expect(user.phone).toBe(userData.phone);
      expect(user.isActive).toBe(true);
      expect(user.isVerified).toBe(false);
      expect((user as any).password).toBeUndefined(); // Password should be removed
    });

    it('should hash the password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123',
        firstName: 'Test',
        lastName: 'User'
      };

      await userService.createUser(userData);

      const dbUser = await prisma.user.findUnique({
        where: { email: 'test@example.com' }
      });

      expect(dbUser?.password).not.toBe(userData.password);
      expect(dbUser?.password).toBeDefined();
    });

    it('should throw error for duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'TestPassword123',
        firstName: 'Test',
        lastName: 'User'
      };

      await userService.createUser(userData);

      await expect(
        userService.createUser(userData)
      ).rejects.toThrow('User with this email already exists');
    });

    it('should throw error for missing required fields', async () => {
      await expect(
        userService.createUser({
          email: 'test@example.com'
          // Missing password, firstName, lastName
        } as any)
      ).rejects.toThrow('Missing required fields');
    });

    it('should validate email format', async () => {
      await expect(
        userService.createUser({
          email: 'invalid-email',
          password: 'TestPassword123',
          firstName: 'Test',
          lastName: 'User'
        })
      ).rejects.toThrow('Invalid email format');
    });

    it('should validate password strength', async () => {
      await expect(
        userService.createUser({
          email: 'test@example.com',
          password: 'weak',
          firstName: 'Test',
          lastName: 'User'
        })
      ).rejects.toThrow('Password must be at least 8 characters');
    });

    it('should normalize email to lowercase', async () => {
      const userData = {
        email: 'TEST@EXAMPLE.COM',
        password: 'TestPassword123',
        firstName: 'Test',
        lastName: 'User'
      };

      const user = await userService.createUser(userData);

      expect(user.email).toBe('test@example.com');
    });
  });

  describe('getUserById', () => {
    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: await hash('TestPassword123', 12),
          firstName: 'Test',
          lastName: 'User',
          isActive: true
        }
      });
    });

    it('should return user by ID', async () => {
      const user = await userService.getUserById(testUser.id);

      expect(user).toBeDefined();
      expect(user.id).toBe(testUser.id);
      expect(user.email).toBe('test@example.com');
      expect((user as any).password).toBeUndefined();
    });

    it('should include addresses when requested', async () => {
      // Create an address for the user
      await prisma.address.create({
        data: {
          userId: testUser.id,
          type: 'SHIPPING',
          firstName: 'Test',
          lastName: 'User',
          street: 'Test Street 123',
          city: 'Oslo',
          postalCode: '0123',
          country: 'Norway',
          isDefault: true
        }
      });

      const user = await userService.getUserById(testUser.id, true);

      expect(user.addresses).toBeDefined();
      expect(user.addresses).toHaveLength(1);
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        userService.getUserById('non-existent-id')
      ).rejects.toThrow('User not found');
    });

    it('should throw error for invalid ID format', async () => {
      await expect(
        userService.getUserById('invalid-id')
      ).rejects.toThrow('Invalid user ID format');
    });
  });

  describe('getUserByEmail', () => {
    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: await hash('TestPassword123', 12),
          firstName: 'Test',
          lastName: 'User',
          isActive: true
        }
      });
    });

    it('should return user by email', async () => {
      const user = await userService.getUserByEmail('test@example.com');

      expect(user).toBeDefined();
      expect(user?.email).toBe('test@example.com');
    });

    it('should return null for non-existent email', async () => {
      const user = await userService.getUserByEmail('nonexistent@example.com');

      expect(user).toBeNull();
    });

    it('should be case insensitive', async () => {
      const user = await userService.getUserByEmail('TEST@EXAMPLE.COM');

      expect(user).toBeDefined();
      expect(user?.email).toBe('test@example.com');
    });

    it('should throw error for invalid email format', async () => {
      await expect(
        userService.getUserByEmail('invalid-email')
      ).rejects.toThrow('Valid email is required');
    });
  });

  describe('updateProfile', () => {
    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: await hash('TestPassword123', 12),
          firstName: 'Test',
          lastName: 'User',
          isActive: true
        }
      });
    });

    it('should update user profile successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+47 987 65 432'
      };

      const updatedUser = await userService.updateProfile(testUser.id, updateData);

      expect(updatedUser.firstName).toBe('Updated');
      expect(updatedUser.lastName).toBe('Name');
      expect(updatedUser.phone).toBe('+47 987 65 432');
      expect((updatedUser as any).password).toBeUndefined();
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        userService.updateProfile('non-existent-id', { firstName: 'Test' })
      ).rejects.toThrow('User not found');
    });
  });

  describe('changePassword', () => {
    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: await hash('OldPassword123', 12),
          firstName: 'Test',
          lastName: 'User',
          isActive: true
        }
      });
    });

    it('should change password successfully', async () => {
      await userService.changePassword(testUser.id, 'OldPassword123', 'NewPassword123');

      // Verify old password no longer works
      const isOldPasswordValid = await userService.verifyPassword(testUser.id, 'OldPassword123');
      expect(isOldPasswordValid).toBe(false);

      // Verify new password works
      const isNewPasswordValid = await userService.verifyPassword(testUser.id, 'NewPassword123');
      expect(isNewPasswordValid).toBe(true);
    });

    it('should throw error for incorrect current password', async () => {
      await expect(
        userService.changePassword(testUser.id, 'WrongPassword', 'NewPassword123')
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should validate new password strength', async () => {
      await expect(
        userService.changePassword(testUser.id, 'OldPassword123', 'weak')
      ).rejects.toThrow('New password must be at least 8 characters');
    });

    it('should throw error for missing passwords', async () => {
      await expect(
        userService.changePassword(testUser.id, '', 'NewPassword123')
      ).rejects.toThrow('Current password and new password are required');
    });
  });

  describe('verifyPassword', () => {
    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: await hash('TestPassword123', 12),
          firstName: 'Test',
          lastName: 'User',
          isActive: true
        }
      });
    });

    it('should verify correct password', async () => {
      const isValid = await userService.verifyPassword(testUser.id, 'TestPassword123');

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const isValid = await userService.verifyPassword(testUser.id, 'WrongPassword');

      expect(isValid).toBe(false);
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        userService.verifyPassword('non-existent-id', 'TestPassword123')
      ).rejects.toThrow('User not found');
    });

    it('should throw error for empty password', async () => {
      await expect(
        userService.verifyPassword(testUser.id, '')
      ).rejects.toThrow('Password is required');
    });
  });

  describe('address management', () => {
    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: await hash('TestPassword123', 12),
          firstName: 'Test',
          lastName: 'User',
          isActive: true
        }
      });
    });

    describe('createAddress', () => {
      it('should create address successfully', async () => {
        const addressData = {
          type: 'SHIPPING' as const,
          firstName: 'Test',
          lastName: 'User',
          street: 'Test Street 123',
          city: 'Oslo',
          postalCode: '0123',
          country: 'Norway',
          isDefault: true
        };

        const address = await userService.createAddress(testUser.id, addressData);

        expect(address).toBeDefined();
        expect(address.type).toBe('SHIPPING');
        expect(address.firstName).toBe('Test');
        expect(address.street).toBe('Test Street 123');
        expect(address.isDefault).toBe(true);
      });

      it('should set new address as default and unset others', async () => {
        // Create first address
        await userService.createAddress(testUser.id, {
          type: 'SHIPPING',
          firstName: 'Test',
          lastName: 'User',
          street: 'First Street',
          city: 'Oslo',
          postalCode: '0123',
          country: 'Norway',
          isDefault: true
        });

        // Create second address as default
        await userService.createAddress(testUser.id, {
          type: 'SHIPPING',
          firstName: 'Test',
          lastName: 'User',
          street: 'Second Street',
          city: 'Bergen',
          postalCode: '5000',
          country: 'Norway',
          isDefault: true
        });

        const addresses = await userService.getUserAddresses(testUser.id);
        const defaultAddresses = addresses.filter(addr => addr.isDefault);

        expect(defaultAddresses).toHaveLength(1);
        expect(defaultAddresses[0]?.street).toBe('Second Street');
      });

      it('should throw error for missing required fields', async () => {
        await expect(
          userService.createAddress(testUser.id, {
            type: 'SHIPPING'
            // Missing required fields
          } as any)
        ).rejects.toThrow('Missing required fields');
      });

      it('should throw error for non-existent user', async () => {
        await expect(
          userService.createAddress('non-existent-id', {
            type: 'SHIPPING',
            firstName: 'Test',
            lastName: 'User',
            street: 'Test Street',
            city: 'Oslo',
            postalCode: '0123',
            country: 'Norway'
          })
        ).rejects.toThrow('User not found');
      });
    });

    describe('getUserAddresses', () => {
      it('should return user addresses ordered by default first', async () => {
        // Create multiple addresses
        await userService.createAddress(testUser.id, {
          type: 'SHIPPING',
          firstName: 'Test',
          lastName: 'User',
          street: 'First Street',
          city: 'Oslo',
          postalCode: '0123',
          country: 'Norway',
          isDefault: false
        });

        await userService.createAddress(testUser.id, {
          type: 'BILLING',
          firstName: 'Test',
          lastName: 'User',
          street: 'Second Street',
          city: 'Bergen',
          postalCode: '5000',
          country: 'Norway',
          isDefault: true
        });

        const addresses = await userService.getUserAddresses(testUser.id);

        expect(addresses).toHaveLength(2);
        expect(addresses[0]?.isDefault).toBe(true);
        expect(addresses[0]?.street).toBe('Second Street');
      });

      it('should return empty array for user with no addresses', async () => {
        const addresses = await userService.getUserAddresses(testUser.id);

        expect(addresses).toHaveLength(0);
      });
    });

    describe('updateAddress', () => {
      let testAddress: any;

      beforeEach(async () => {
        testAddress = await userService.createAddress(testUser.id, {
          type: 'SHIPPING',
          firstName: 'Test',
          lastName: 'User',
          street: 'Original Street',
          city: 'Oslo',
          postalCode: '0123',
          country: 'Norway'
        });
      });

      it('should update address successfully', async () => {
        const updateData = {
          street: 'Updated Street',
          city: 'Bergen',
          postalCode: '5000'
        };

        const updatedAddress = await userService.updateAddress(
          testUser.id,
          testAddress.id,
          updateData
        );

        expect(updatedAddress.street).toBe('Updated Street');
        expect(updatedAddress.city).toBe('Bergen');
        expect(updatedAddress.postalCode).toBe('5000');
      });

      it('should throw error for non-existent address', async () => {
        await expect(
          userService.updateAddress(testUser.id, 'non-existent-id', { street: 'Updated' })
        ).rejects.toThrow('Address not found');
      });

      it('should throw error for address belonging to different user', async () => {
        const anotherUser = await prisma.user.create({
          data: {
            email: 'another@example.com',
            password: await hash('TestPassword123', 12),
            firstName: 'Another',
            lastName: 'User',
            isActive: true
          }
        });

        await expect(
          userService.updateAddress(anotherUser.id, testAddress.id, { street: 'Updated' })
        ).rejects.toThrow('Address not found');
      });
    });

    describe('deleteAddress', () => {
      let testAddress: any;

      beforeEach(async () => {
        testAddress = await userService.createAddress(testUser.id, {
          type: 'SHIPPING',
          firstName: 'Test',
          lastName: 'User',
          street: 'Test Street',
          city: 'Oslo',
          postalCode: '0123',
          country: 'Norway'
        });
      });

      it('should delete address successfully', async () => {
        await userService.deleteAddress(testUser.id, testAddress.id);

        const addresses = await userService.getUserAddresses(testUser.id);
        expect(addresses).toHaveLength(0);
      });

      it('should throw error for non-existent address', async () => {
        await expect(
          userService.deleteAddress(testUser.id, 'non-existent-id')
        ).rejects.toThrow('Address not found');
      });

      it('should throw error for address belonging to different user', async () => {
        const anotherUser = await prisma.user.create({
          data: {
            email: 'another@example.com',
            password: await hash('TestPassword123', 12),
            firstName: 'Another',
            lastName: 'User',
            isActive: true
          }
        });

        await expect(
          userService.deleteAddress(anotherUser.id, testAddress.id)
        ).rejects.toThrow('Address not found');
      });
    });
  });

  describe('deactivateUser', () => {
    beforeEach(async () => {
      testUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: await hash('TestPassword123', 12),
          firstName: 'Test',
          lastName: 'User',
          isActive: true
        }
      });
    });

    it('should deactivate user successfully', async () => {
      await userService.deactivateUser(testUser.id);

      const deactivatedUser = await prisma.user.findUnique({
        where: { id: testUser.id }
      });

      expect(deactivatedUser?.isActive).toBe(false);
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        userService.deactivateUser('non-existent-id')
      ).rejects.toThrow('User not found');
    });
  });
});