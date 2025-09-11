"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationSchema = exports.idParamSchema = exports.updateBookingSchema = exports.createBookingSchema = exports.eventQuerySchema = exports.updateEventSchema = exports.createEventSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
// User validation schemas
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Please provide a valid email address'),
    password: zod_1.z.string()
        .min(8, 'Password must be at least 8 characters long')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    name: zod_1.z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
    role: zod_1.z.enum(['USER', 'ADMIN']).default('USER').optional()
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Please provide a valid email address'),
    password: zod_1.z.string().min(1, 'Password is required')
});
// Event validation schemas
exports.createEventSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Event name is required').max(200, 'Event name must be less than 200 characters'),
    description: zod_1.z.string().max(1000, 'Description must be less than 1000 characters').optional(),
    venue: zod_1.z.string().min(1, 'Venue is required').max(200, 'Venue must be less than 200 characters'),
    startTime: zod_1.z.string().datetime('Please provide a valid start time in ISO format'),
    endTime: zod_1.z.string().datetime('Please provide a valid end time in ISO format').optional(),
    capacity: zod_1.z.number().int('Capacity must be an integer').min(1, 'Capacity must be at least 1').max(100000, 'Capacity cannot exceed 100,000'),
    price: zod_1.z.number().min(0, 'Price cannot be negative').max(99999.99, 'Price cannot exceed $99,999.99').default(0),
    category: zod_1.z.enum(['CONFERENCE', 'WORKSHOP', 'NETWORKING', 'SOCIAL', 'BUSINESS', 'ENTERTAINMENT', 'SPORTS', 'EDUCATION', 'CULTURAL', 'OTHER']).default('OTHER').optional(),
    tags: zod_1.z.array(zod_1.z.string().max(50, 'Each tag must be less than 50 characters')).max(10, 'Maximum 10 tags allowed').optional(),
    imageUrl: zod_1.z.string().url('Please provide a valid URL').optional()
}).refine((data) => {
    if (data.endTime) {
        return new Date(data.startTime) < new Date(data.endTime);
    }
    return true;
}, {
    message: 'End time must be after start time',
    path: ['endTime']
});
exports.updateEventSchema = exports.createEventSchema.partial();
exports.eventQuerySchema = zod_1.z.object({
    page: zod_1.z.string().regex(/^\d+$/, 'Page must be a positive number').optional().transform(val => val ? parseInt(val) : 1),
    limit: zod_1.z.string().regex(/^\d+$/, 'Limit must be a positive number').optional().transform(val => val ? parseInt(val) : 10),
    search: zod_1.z.string().max(100, 'Search term must be less than 100 characters').optional(),
    sortBy: zod_1.z.enum(['name', 'startTime', 'price', 'capacity', 'createdAt']).optional().default('startTime'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('asc')
});
// Booking validation schemas
exports.createBookingSchema = zod_1.z.object({
    eventId: zod_1.z.string().cuid('Please provide a valid event ID'),
    quantity: zod_1.z.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1').max(10, 'Maximum 10 tickets per booking'),
    idempotencyKey: zod_1.z.string().min(1, 'Idempotency key is required').max(100, 'Idempotency key must be less than 100 characters').optional()
});
exports.updateBookingSchema = zod_1.z.object({
    status: zod_1.z.enum(['CONFIRMED', 'CANCELLED', 'PENDING']).refine((status) => ['CONFIRMED', 'CANCELLED', 'PENDING'].includes(status), { message: 'Status must be one of: CONFIRMED, CANCELLED, PENDING' })
});
// Common validation schemas
exports.idParamSchema = zod_1.z.object({
    id: zod_1.z.string().cuid('Please provide a valid ID')
});
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.number().int().min(1, 'Page must be at least 1').default(1),
    limit: zod_1.z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(10)
});
