"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequestSize = exports.sanitizeInput = exports.validateRequest = void 0;
const errorHandler_1 = require("./errorHandler");
// Validation middleware factory
const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            // Validate request body
            if (schema.body) {
                const bodyResult = schema.body.safeParse(req.body);
                if (!bodyResult.success) {
                    const errors = bodyResult.error.issues.map(issue => ({
                        field: issue.path.join('.'),
                        message: issue.message,
                        code: issue.code,
                        location: 'body'
                    }));
                    return res.status(400).json({
                        status: 'error',
                        message: 'Request body validation failed',
                        errors
                    });
                }
                req.body = bodyResult.data;
            }
            // Validate query parameters
            if (schema.query) {
                const queryResult = schema.query.safeParse(req.query);
                if (!queryResult.success) {
                    const errors = queryResult.error.issues.map(issue => ({
                        field: issue.path.join('.'),
                        message: issue.message,
                        code: issue.code,
                        location: 'query'
                    }));
                    return res.status(400).json({
                        status: 'error',
                        message: 'Query parameters validation failed',
                        errors
                    });
                }
                req.query = queryResult.data;
            }
            // Validate route parameters
            if (schema.params) {
                const paramsResult = schema.params.safeParse(req.params);
                if (!paramsResult.success) {
                    const errors = paramsResult.error.issues.map(issue => ({
                        field: issue.path.join('.'),
                        message: issue.message,
                        code: issue.code,
                        location: 'params'
                    }));
                    return res.status(400).json({
                        status: 'error',
                        message: 'Route parameters validation failed',
                        errors
                    });
                }
                req.params = paramsResult.data;
            }
            next();
        }
        catch (error) {
            next((0, errorHandler_1.createValidationError)('Validation middleware error'));
        }
    };
};
exports.validateRequest = validateRequest;
// Middleware to sanitize common inputs
const sanitizeInput = (req, res, next) => {
    // Trim whitespace from string fields in body
    if (req.body && typeof req.body === 'object') {
        for (const key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].trim();
            }
        }
    }
    // Trim whitespace from query parameters
    if (req.query && typeof req.query === 'object') {
        for (const key in req.query) {
            if (typeof req.query[key] === 'string') {
                req.query[key] = req.query[key].trim();
            }
        }
    }
    next();
};
exports.sanitizeInput = sanitizeInput;
// Request size validation
const validateRequestSize = (req, res, next) => {
    const maxBodySize = 1024 * 1024; // 1MB
    if (req.body && JSON.stringify(req.body).length > maxBodySize) {
        return res.status(413).json({
            status: 'error',
            message: 'Request body too large',
            maxSize: '1MB'
        });
    }
    next();
};
exports.validateRequestSize = validateRequestSize;
