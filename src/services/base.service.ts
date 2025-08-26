import prisma from '@/config/database';
import { AppError, ErrorCodes, ErrorSeverity } from '@/middleware/errorHandler';

/**
 * Base service class with common database operations and error handling
 */
export abstract class BaseService {
  protected db = prisma;

  /**
   * Create standardized error for database operations
   */
  protected createDatabaseError(message: string, originalError: any): AppError {
    return new AppError(
      message,
      500,
      ErrorCodes.DATABASE_ERROR,
      [{ message: originalError.message || 'Database operation failed' }],
      ErrorSeverity.HIGH
    );
  }

  /**
   * Create validation error
   */
  protected createValidationError(message: string, field?: string): AppError {
    const errorDetail = field ? { message, field } : { message };
    return new AppError(
      message,
      400,
      ErrorCodes.VALIDATION_ERROR,
      [errorDetail],
      ErrorSeverity.LOW
    );
  }

  /**
   * Create not found error
   */
  protected createNotFoundError(resource: string): AppError {
    return new AppError(
      `${resource} not found`,
      404,
      ErrorCodes.NOT_FOUND,
      [{ message: `${resource} does not exist` }],
      ErrorSeverity.LOW
    );
  }

  /**
   * Create unauthorized error
   */
  protected createUnauthorizedError(message: string = 'Unauthorized'): AppError {
    return new AppError(
      message,
      401,
      ErrorCodes.UNAUTHORIZED,
      [{ message }],
      ErrorSeverity.MEDIUM
    );
  }

  /**
   * Create conflict error
   */
  protected createConflictError(message: string, field?: string): AppError {
    const errorDetail = field ? { message, field } : { message };
    return new AppError(
      message,
      409,
      ErrorCodes.CONFLICT,
      [errorDetail],
      ErrorSeverity.LOW
    );
  }

  /**
   * Handle database operations with error wrapping
   */
  protected async handleDatabaseOperation<T>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw this.createDatabaseError(errorMessage, error);
    }
  }

  /**
   * Validate required fields
   */
  protected validateRequiredFields(data: Record<string, any>, fields: string[]): void {
    const missingFields = fields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      throw this.createValidationError(
        `Missing required fields: ${missingFields.join(', ')}`,
        missingFields[0]
      );
    }
  }

  /**
   * Validate ID format (UUID)
   */
  protected validateId(id: string, resourceName: string = 'Resource'): void {
    if (!id) {
      throw this.createValidationError(`${resourceName} ID is required`);
    }

    // Support both UUID and cuid formats
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const cuidRegex = /^c[a-z0-9]{24}$/i;
    
    if (!uuidRegex.test(id) && !cuidRegex.test(id)) {
      throw this.createValidationError(`Invalid ${resourceName.toLowerCase()} ID format`);
    }
  }

  /**
   * Ensure resource exists or throw not found error
   */
  protected async ensureExists<T>(
    findOperation: () => Promise<T | null>,
    resourceName: string
  ): Promise<T> {
    const resource = await findOperation();
    if (!resource) {
      throw this.createNotFoundError(resourceName);
    }
    return resource;
  }
}