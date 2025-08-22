import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger.simple';

export enum ErrorCodes {
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  DATABASE_ERROR = 'DATABASE_ERROR',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  INVALID_TOKEN = 'INVALID_TOKEN'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ErrorDetail {
  message: string;
  field?: string;
  code?: string;
}

export interface ApiError {
  success: false;
  message: string;
  code: ErrorCodes;
  errors?: ErrorDetail[];
  timestamp: string;
  path: string;
}

export class AppError extends Error {
  public statusCode: number;
  public code: ErrorCodes;
  public errors: ErrorDetail[];
  public severity: ErrorSeverity;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: ErrorCodes = ErrorCodes.INTERNAL_SERVER_ERROR,
    errors: ErrorDetail[] = [],
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    this.severity = severity;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let code: ErrorCodes = ErrorCodes.INTERNAL_SERVER_ERROR;
  let message = 'Internal Server Error';
  let errors: ErrorDetail[] = [];
  let severity = ErrorSeverity.HIGH;

  // Handle custom AppError
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    errors = error.errors;
    severity = error.severity;
  }
  // Handle Prisma errors
  else if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    switch (prismaError.code) {
      case 'P2002':
        statusCode = 409;
        code = ErrorCodes.CONFLICT;
        message = 'Resource already exists';
        errors = [{ message: 'A record with this data already exists' }];
        severity = ErrorSeverity.LOW;
        break;
      case 'P2025':
        statusCode = 404;
        code = ErrorCodes.NOT_FOUND;
        message = 'Resource not found';
        errors = [{ message: 'The requested resource was not found' }];
        severity = ErrorSeverity.LOW;
        break;
      case 'P2003':
        statusCode = 400;
        code = ErrorCodes.VALIDATION_ERROR;
        message = 'Foreign key constraint failed';
        errors = [{ message: 'Related resource not found' }];
        severity = ErrorSeverity.LOW;
        break;
      default:
        statusCode = 500;
        code = ErrorCodes.DATABASE_ERROR;
        message = 'Database error';
        errors = [{ message: 'A database error occurred' }];
        severity = ErrorSeverity.HIGH;
    }
  }
  // Handle validation errors
  else if (error.name === 'ValidationError') {
    statusCode = 400;
    code = ErrorCodes.VALIDATION_ERROR;
    message = 'Validation failed';
    severity = ErrorSeverity.LOW;
  }
  // Handle JWT errors
  else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    statusCode = 401;
    code = ErrorCodes.UNAUTHORIZED;
    message = 'Authentication failed';
    errors = [{ message: 'Invalid or expired token' }];
    severity = ErrorSeverity.MEDIUM;
  }
  // Handle unknown errors
  else {
    if (process.env.NODE_ENV === 'production') {
      message = 'Something went wrong';
      errors = [{ message: 'An unexpected error occurred' }];
    } else {
      message = error.message || 'Internal Server Error';
      errors = [{ message: error.message || 'Unknown error' }];
    }
  }

  // Log error with severity
  logger.error(`${severity} ERROR:`, {
    message,
    code,
    statusCode,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Send standardized error response
  const errorResponse: ApiError = {
    success: false,
    message,
    code,
    errors,
    timestamp: new Date().toISOString(),
    path: req.path
  };

  res.status(statusCode).json(errorResponse);
};