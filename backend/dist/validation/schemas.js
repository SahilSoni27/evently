"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventQuerySchema = exports.paginationSchema = exports.bookingSchema = exports.updateEventSchema = exports.eventSchema = exports.loginSchema = exports.registerSchema = exports.nameSchema = exports.passwordSchema = exports.emailSchema = void 0;
const zod_1 = require("zod");
// Common validation patterns
exports.emailSchema = zod_1.z.string()
    .email('Invalid email format')
    .min(3, 'Email must be at least 3 characters')
    .max(100, 'Email must be less than 100 characters');
exports.passwordSchema = zod_1.z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number');
exports.nameSchema = zod_1.z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces');
// Auth validation schemas
exports.registerSchema = zod_1.z.object({
    email: exports.emailSchema,
    password: exports.passwordSchema,
    name: exports.nameSchema,
});
exports.loginSchema = zod_1.z.object({
    email: exports.emailSchema,
    password: zod_1.z.string().min(1, 'Password is required'),
});
// Event validation schemas
exports.eventSchema = zod_1.z.object({
    title: zod_1.z.string()
        .min(3, 'Title must be at least 3 characters')
        .max(100, 'Title must be less than 100 characters'),
    description: zod_1.z.string()
        .min(10, 'Description must be at least 10 characters')
        .max(1000, 'Description must be less than 1000 characters'),
    datetime: zod_1.z.string()
        .datetime('Invalid datetime format')
        .refine((date) => new Date(date) > new Date(), 'Event date must be in the future'),
    location: zod_1.z.string()
        .min(3, 'Location must be at least 3 characters')
        .max(200, 'Location must be less than 200 characters'),
    totalTickets: zod_1.z.number()
        .int('Total tickets must be an integer')
        .min(1, 'Must have at least 1 ticket')
        .max(10000, 'Cannot exceed 10,000 tickets'),
    price: zod_1.z.number()
        .min(0, 'Price cannot be negative')
        .max(10000, 'Price cannot exceed $10,000'),
    category: zod_1.z.enum(['CONFERENCE', 'WORKSHOP', 'CONCERT', 'SPORTS', 'OTHER'], {
        message: 'Invalid category'
    }),
});
exports.updateEventSchema = exports.eventSchema.partial();
// Booking validation schemas
exports.bookingSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid('Invalid event ID'),
    quantity: zod_1.z.number()
        .int('Quantity must be an integer')
        .min(1, 'Must book at least 1 ticket')
        .max(10, 'Cannot book more than 10 tickets at once'),
    idempotencyKey: zod_1.z.string()
        .min(1, 'Idempotency key is required')
        .max(100, 'Idempotency key too long')
        .optional(),
});
// Query parameter schemas
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.string()
        .optional()
        .transform((val) => val ? parseInt(val, 10) : 1)
        .refine((val) => val > 0, 'Page must be greater than 0'),
    limit: zod_1.z.string()
        .optional()
        .transform((val) => val ? parseInt(val, 10) : 10)
        .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
});
exports.eventQuerySchema = zod_1.z.object({
    category: zod_1.z.enum(['CONFERENCE', 'WORKSHOP', 'CONCERT', 'SPORTS', 'OTHER']).optional(),
    search: zod_1.z.string().max(100, 'Search term too long').optional(),
    sortBy: zod_1.z.enum(['datetime', 'price', 'title', 'createdAt']).optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional(),
}).merge(exports.paginationSchema);
