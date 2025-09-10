import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
}

export const createError = (message: string, statusCode: number = 500): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

// Helper function to handle Prisma errors
const handlePrismaError = (error: Prisma.PrismaClientKnownRequestError): AppError => {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const field = error.meta?.target as string[] | undefined;
      const fieldName = field?.[0] || 'field';
      return createError(`A record with this ${fieldName} already exists`, 409);
    
    case 'P2025':
      // Record not found
      return createError('Record not found', 404);
    
    case 'P2003':
      // Foreign key constraint violation
      return createError('Related record not found', 400);
    
    case 'P2014':
      // Required relation violation
      return createError('Invalid relationship data provided', 400);
    
    case 'P2023':
      // Inconsistent column data
      return createError('Invalid data format provided', 400);
    
    default:
      console.error('Unhandled Prisma error:', error);
      return createError('Database error occurred', 500);
  }
};

// Helper function to handle validation errors
const handleValidationError = (error: any): AppError => {
  if (error.name === 'ZodError') {
    const validationErrors = error.issues.map((issue: any) => ({
      field: issue.path.join('.'),
      message: issue.message
    }));
    return createError(`Validation failed: ${validationErrors.map((e: any) => e.message).join(', ')}`, 400);
  }
  return createError('Validation error occurred', 400);
};

export const errorHandler = (
  err: AppError | Prisma.PrismaClientKnownRequestError | any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error: AppError;

  // Handle different types of errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    error = handlePrismaError(err);
  } else if (err.name === 'ZodError') {
    error = handleValidationError(err);
  } else if (err.isOperational) {
    error = err as AppError;
  } else {
    // Generic error handling
    error = createError(
      process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
      err.statusCode || 500
    );
  }

  // Log error details in development or for server errors
  if (process.env.NODE_ENV === 'development' || error.statusCode >= 500) {
    console.error('🚨 Error:', {
      message: error.message,
      statusCode: error.statusCode,
      stack: error.stack,
      url: req.url,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query,
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    });
  }

  // Send error response
  const response: any = {
    status: 'error',
    statusCode: error.statusCode,
    message: error.message,
  };

  // Include error details in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
    response.originalError = err.name;
  }

  res.status(error.statusCode).json(response);
};

// Not found middleware (should be used before error handler)
export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = createError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

// Async error wrapper to catch errors in async route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
