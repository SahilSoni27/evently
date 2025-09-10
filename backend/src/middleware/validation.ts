import { Request, Response, NextFunction } from 'express';
import { z, ZodIssue } from 'zod';

// Generic validation middleware factory
export const validate = (schema: z.ZodSchema<any>, source: 'body' | 'params' | 'query' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
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
          errors: validationResult.error.issues.map((err: ZodIssue) => ({
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
    } catch (error) {
      console.error('Validation middleware error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal validation error'
      });
    }
  };
};

// Specific validation middleware functions
export const validateBody = (schema: z.ZodSchema<any>) => validate(schema, 'body');
export const validateParams = (schema: z.ZodSchema<any>) => validate(schema, 'params');
export const validateQuery = (schema: z.ZodSchema<any>) => validate(schema, 'query');

// Combined validation for multiple sources
export const validateMultiple = (schemas: {
  body?: z.ZodSchema<any>;
  params?: z.ZodSchema<any>;
  query?: z.ZodSchema<any>;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors: Array<{ field: string; message: string; code: string; source: string }> = [];

      // Validate body if schema provided
      if (schemas.body) {
        const bodyResult = schemas.body.safeParse(req.body);
        if (!bodyResult.success) {
          errors.push(...bodyResult.error.issues.map((err: ZodIssue) => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
            source: 'body'
          })));
        } else {
          req.body = bodyResult.data;
        }
      }

      // Validate params if schema provided
      if (schemas.params) {
        const paramsResult = schemas.params.safeParse(req.params);
        if (!paramsResult.success) {
          errors.push(...paramsResult.error.issues.map((err: ZodIssue) => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
            source: 'params'
          })));
        } else {
          req.params = paramsResult.data;
        }
      }

      // Validate query if schema provided
      if (schemas.query) {
        const queryResult = schemas.query.safeParse(req.query);
        if (!queryResult.success) {
          errors.push(...queryResult.error.issues.map((err: ZodIssue) => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
            source: 'query'
          })));
        } else {
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
    } catch (error) {
      console.error('Multiple validation middleware error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal validation error'
      });
    }
  };
};
