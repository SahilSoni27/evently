"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.idParamSchema = exports.eventSearchSchema = exports.paginationSchema = exports.createBookingSchema = exports.updateEventSchema = exports.createEventSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
// Common validation patterns
const passwordSchema = zod_1.z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must be no more than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number');
const emailSchema = zod_1.z
    .string()
    .email('Please provide a valid email address')
    .max(255, 'Email must be no more than 255 characters')
    .transform(email => email.toLowerCase().trim());
const nameSchema = zod_1.z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be no more than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
    .transform(name => name.trim());
// User registration validation
exports.registerSchema = zod_1.z.object({
    email: emailSchema,
    password: passwordSchema,
    name: nameSchema,
    role: zod_1.z.enum(['USER', 'ADMIN']).default('USER').optional()
});
// User login validation
exports.loginSchema = zod_1.z.object({
    email: emailSchema,
    password: zod_1.z.string().min(1, 'Password is required').max(128, 'Invalid password length')
});
// Event validation schemas
exports.createEventSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(3, 'Event name must be at least 3 characters')
        .max(200, 'Event name must be no more than 200 characters')
        .trim(),
    description: zod_1.z
        .string()
        .min(10, 'Description must be at least 10 characters')
        .max(2000, 'Description must be no more than 2000 characters')
        .trim(),
    venue: zod_1.z
        .string()
        .min(3, 'Venue must be at least 3 characters')
        .max(300, 'Venue must be no more than 300 characters')
        .trim(),
    startTime: zod_1.z
        .string()
        .datetime('Invalid start time format')
        .refine(date => new Date(date) > new Date(), 'Start time must be in the future'),
    endTime: zod_1.z
        .string()
        .datetime('Invalid end time format'),
    capacity: zod_1.z
        .number()
        .int('Capacity must be a whole number')
        .min(1, 'Capacity must be at least 1')
        .max(100000, 'Capacity cannot exceed 100,000'),
    price: zod_1.z
        .number()
        .min(0, 'Price cannot be negative')
        .max(10000, 'Price cannot exceed $10,000')
        .multipleOf(0.01, 'Price must have at most 2 decimal places')
}).refine(data => new Date(data.endTime) > new Date(data.startTime), {
    message: 'End time must be after start time',
    path: ['endTime']
});
exports.updateEventSchema = exports.createEventSchema.partial();
// Booking validation schemas
exports.createBookingSchema = zod_1.z.object({
    eventId: zod_1.z
        .string()
        .min(1, 'Event ID is required')
        .cuid('Invalid event ID format'),
    quantity: zod_1.z
        .number()
        .int('Quantity must be a whole number')
        .min(1, 'Quantity must be at least 1')
        .max(10, 'Cannot book more than 10 tickets at once'),
    idempotencyKey: zod_1.z
        .string()
        .min(1, 'Idempotency key is required')
        .max(100, 'Idempotency key is too long')
        .optional()
});
// Query parameter validation
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z
        .string()
        .optional()
        .transform(val => val ? parseInt(val, 10) : 1)
        .refine(val => val > 0, 'Page must be a positive number'),
    limit: zod_1.z
        .string()
        .optional()
        .transform(val => val ? Math.min(parseInt(val, 10), 100) : 10)
        .refine(val => val > 0, 'Limit must be a positive number'),
    sortBy: zod_1.z
        .enum(['name', 'startTime', 'price', 'createdAt'])
        .optional()
        .default('createdAt'),
    sortOrder: zod_1.z
        .enum(['asc', 'desc'])
        .optional()
        .default('desc')
});
exports.eventSearchSchema = zod_1.z.object({
    search: zod_1.z
        .string()
        .max(100, 'Search term is too long')
        .optional(),
    startDate: zod_1.z
        .string()
        .datetime('Invalid start date format')
        .optional(),
    endDate: zod_1.z
        .string()
        .datetime('Invalid end date format')
        .optional(),
    minPrice: zod_1.z
        .string()
        .optional()
        .transform(val => val ? parseFloat(val) : undefined)
        .refine(val => val === undefined || val >= 0, 'Minimum price cannot be negative'),
    maxPrice: zod_1.z
        .string()
        .optional()
        .transform(val => val ? parseFloat(val) : undefined)
        .refine(val => val === undefined || val >= 0, 'Maximum price cannot be negative')
}).refine(data => {
    if (data.minPrice !== undefined && data.maxPrice !== undefined) {
        return data.minPrice <= data.maxPrice;
    }
    return true;
}, {
    message: 'Minimum price cannot be greater than maximum price',
    path: ['minPrice']
});
// ID parameter validation
exports.idParamSchema = zod_1.z.object({
    id: zod_1.z.string().cuid('Invalid ID format')
});
