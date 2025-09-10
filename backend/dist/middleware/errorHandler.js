"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.asyncHandler = exports.errorHandler = exports.createConflictError = exports.createForbiddenError = exports.createUnauthorizedError = exports.createNotFoundError = exports.createValidationError = exports.createError = exports.AppError = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
// Custom error class
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
// Error factory functions
const createError = (message, statusCode = 400) => {
    return new AppError(message, statusCode);
};
exports.createError = createError;
const createValidationError = (message = 'Validation failed') => {
    return new AppError(message, 400);
};
exports.createValidationError = createValidationError;
const createNotFoundError = (resource = 'Resource') => {
    return new AppError(`${resource} not found`, 404);
};
exports.createNotFoundError = createNotFoundError;
const createUnauthorizedError = (message = 'Unauthorized') => {
    return new AppError(message, 401);
};
exports.createUnauthorizedError = createUnauthorizedError;
const createForbiddenError = (message = 'Forbidden') => {
    return new AppError(message, 403);
};
exports.createForbiddenError = createForbiddenError;
const createConflictError = (message = 'Resource already exists') => {
    return new AppError(message, 409);
};
exports.createConflictError = createConflictError;
// Error response formatter
const formatErrorResponse = (error, req) => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const baseResponse = {
        status: 'error',
        message: error.message || 'Internal server error',
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method,
    };
    // Add stack trace in development
    if (isDevelopment && error.stack) {
        baseResponse.stack = error.stack;
    }
    return baseResponse;
};
// Handle Zod validation errors
const handleZodError = (error) => {
    const errors = error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
    }));
    return {
        statusCode: 400,
        message: 'Validation failed',
        errors,
    };
};
// Handle Prisma errors
const handlePrismaError = (error) => {
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
            case 'P2002':
                // Unique constraint violation
                const field = error.meta?.target || ['field'];
                return {
                    statusCode: 409,
                    message: `${field.join(', ')} already exists`,
                };
            case 'P2025':
                // Record not found
                return {
                    statusCode: 404,
                    message: 'Record not found',
                };
            case 'P2003':
                // Foreign key constraint violation
                return {
                    statusCode: 400,
                    message: 'Invalid reference to related record',
                };
            case 'P2014':
                // Required relation violation
                return {
                    statusCode: 400,
                    message: 'Required relation is missing',
                };
            default:
                return {
                    statusCode: 500,
                    message: 'Database error occurred',
                };
        }
    }
    if (error instanceof client_1.Prisma.PrismaClientValidationError) {
        return {
            statusCode: 400,
            message: 'Invalid data provided',
        };
    }
    return {
        statusCode: 500,
        message: 'Database connection error',
    };
};
// Main error handler middleware
const errorHandler = (error, req, res, next) => {
    let statusCode = 500;
    let response = formatErrorResponse(error, req);
    // Handle different error types
    if (error instanceof AppError) {
        statusCode = error.statusCode;
    }
    else if (error instanceof zod_1.ZodError) {
        const zodError = handleZodError(error);
        statusCode = zodError.statusCode;
        response = { ...response, ...zodError };
    }
    else if (error.constructor.name.includes('Prisma')) {
        const prismaError = handlePrismaError(error);
        statusCode = prismaError.statusCode;
        response.message = prismaError.message;
    }
    else if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        response.message = 'Invalid token';
    }
    else if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        response.message = 'Token expired';
    }
    else if (error.name === 'CastError') {
        statusCode = 400;
        response.message = 'Invalid ID format';
    }
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
        console.error('🚨 Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            statusCode,
        });
    }
    res.status(statusCode).json(response);
};
exports.errorHandler = errorHandler;
// Async error wrapper
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
// 404 handler for undefined routes
const notFoundHandler = (req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
        method: req.method,
    });
};
exports.notFoundHandler = notFoundHandler;
