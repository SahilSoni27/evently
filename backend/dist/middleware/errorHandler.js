"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.notFound = exports.errorHandler = exports.createError = void 0;
const client_1 = require("@prisma/client");
const createError = (message, statusCode = 500) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = true;
    return error;
};
exports.createError = createError;
// Helper function to handle Prisma errors
const handlePrismaError = (error) => {
    switch (error.code) {
        case 'P2002':
            // Unique constraint violation
            const field = error.meta?.target;
            const fieldName = field?.[0] || 'field';
            return (0, exports.createError)(`A record with this ${fieldName} already exists`, 409);
        case 'P2025':
            // Record not found
            return (0, exports.createError)('Record not found', 404);
        case 'P2003':
            // Foreign key constraint violation
            return (0, exports.createError)('Related record not found', 400);
        case 'P2014':
            // Required relation violation
            return (0, exports.createError)('Invalid relationship data provided', 400);
        case 'P2023':
            // Inconsistent column data
            return (0, exports.createError)('Invalid data format provided', 400);
        default:
            console.error('Unhandled Prisma error:', error);
            return (0, exports.createError)('Database error occurred', 500);
    }
};
// Helper function to handle validation errors
const handleValidationError = (error) => {
    if (error.name === 'ZodError') {
        const validationErrors = error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message
        }));
        return (0, exports.createError)(`Validation failed: ${validationErrors.map((e) => e.message).join(', ')}`, 400);
    }
    return (0, exports.createError)('Validation error occurred', 400);
};
const errorHandler = (err, req, res, next) => {
    let error;
    // Handle different types of errors
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        error = handlePrismaError(err);
    }
    else if (err.name === 'ZodError') {
        error = handleValidationError(err);
    }
    else if (err.isOperational) {
        error = err;
    }
    else {
        // Generic error handling
        error = (0, exports.createError)(process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message, err.statusCode || 500);
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
    const response = {
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
exports.errorHandler = errorHandler;
// Not found middleware (should be used before error handler)
const notFound = (req, res, next) => {
    const error = (0, exports.createError)(`Route ${req.originalUrl} not found`, 404);
    next(error);
};
exports.notFound = notFound;
// Async error wrapper to catch errors in async route handlers
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
