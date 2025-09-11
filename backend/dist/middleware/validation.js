"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateMultiple = exports.validateQuery = exports.validateParams = exports.validateBody = exports.validate = void 0;
// Generic validation middleware factory
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        try {
            let dataToValidate;
            switch (source) {
                case 'body':
                    dataToValidate = req.body;
                    break;
                case 'params':
                    dataToValidate = req.params;
                    break;
                case 'query':
                    dataToValidate = req.query;
                    break;
                default:
                    dataToValidate = req.body;
            }
            const validationResult = schema.safeParse(dataToValidate);
            if (!validationResult.success) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Validation failed',
                    errors: validationResult.error.issues.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                        code: err.code
                    }))
                });
            }
            // Replace the request data with validated data
            switch (source) {
                case 'body':
                    req.body = validationResult.data;
                    break;
                case 'params':
                    req.params = validationResult.data;
                    break;
                case 'query':
                    // Don't overwrite req.query as it's read-only, validation passed is sufficient
                    break;
            }
            next();
        }
        catch (error) {
            console.error('Validation middleware error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Internal validation error'
            });
        }
    };
};
exports.validate = validate;
// Specific validation middleware functions
const validateBody = (schema) => (0, exports.validate)(schema, 'body');
exports.validateBody = validateBody;
const validateParams = (schema) => (0, exports.validate)(schema, 'params');
exports.validateParams = validateParams;
const validateQuery = (schema) => (0, exports.validate)(schema, 'query');
exports.validateQuery = validateQuery;
// Combined validation for multiple sources
const validateMultiple = (schemas) => {
    return (req, res, next) => {
        try {
            const errors = [];
            // Validate body if schema provided
            if (schemas.body) {
                const bodyResult = schemas.body.safeParse(req.body);
                if (!bodyResult.success) {
                    errors.push(...bodyResult.error.issues.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                        code: err.code,
                        source: 'body'
                    })));
                }
                else {
                    req.body = bodyResult.data;
                }
            }
            // Validate params if schema provided
            if (schemas.params) {
                const paramsResult = schemas.params.safeParse(req.params);
                if (!paramsResult.success) {
                    errors.push(...paramsResult.error.issues.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                        code: err.code,
                        source: 'params'
                    })));
                }
                else {
                    req.params = paramsResult.data;
                }
            }
            // Validate query if schema provided
            if (schemas.query) {
                const queryResult = schemas.query.safeParse(req.query);
                if (!queryResult.success) {
                    errors.push(...queryResult.error.issues.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                        code: err.code,
                        source: 'query'
                    })));
                }
                else {
                    // Don't overwrite req.query, just ensure validation passed
                    // The controller can use the validated data from queryResult.data if needed
                }
            }
            if (errors.length > 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Validation failed',
                    errors
                });
            }
            next();
        }
        catch (error) {
            console.error('Multiple validation middleware error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Internal validation error'
            });
        }
    };
};
exports.validateMultiple = validateMultiple;
