import { z } from 'zod';

// User validation schemas
export const registerSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  role: z.enum(['USER', 'ADMIN']).default('USER').optional()
});

export const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required')
});

// Event validation schemas
export const createEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(200, 'Event name must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  venue: z.string().min(1, 'Venue is required').max(200, 'Venue must be less than 200 characters'),
  startTime: z.string().datetime('Please provide a valid start time in ISO format'),
  endTime: z.string().datetime('Please provide a valid end time in ISO format').optional(),
  capacity: z.number().int('Capacity must be an integer').min(1, 'Capacity must be at least 1').max(100000, 'Capacity cannot exceed 100,000'),
  price: z.number().min(0, 'Price cannot be negative').max(99999.99, 'Price cannot exceed $99,999.99').default(0),
  category: z.enum(['CONFERENCE', 'WORKSHOP', 'NETWORKING', 'SOCIAL', 'BUSINESS', 'ENTERTAINMENT', 'SPORTS', 'EDUCATION', 'CULTURAL', 'OTHER']).default('OTHER').optional(),
  tags: z.array(z.string().max(50, 'Each tag must be less than 50 characters')).max(10, 'Maximum 10 tags allowed').optional(),
  imageUrl: z.string().url('Please provide a valid URL').optional()
}).refine((data) => {
  if (data.endTime) {
    return new Date(data.startTime) < new Date(data.endTime);
  }
  return true;
}, {
  message: 'End time must be after start time',
  path: ['endTime']
});

export const updateEventSchema = createEventSchema.partial();

export const eventQuerySchema = z.object({
  page: z.string().regex(/^\d+$/, 'Page must be a positive number').optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().regex(/^\d+$/, 'Limit must be a positive number').optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().max(100, 'Search term must be less than 100 characters').optional(),
  sortBy: z.enum(['name', 'startTime', 'price', 'capacity', 'createdAt']).optional().default('startTime'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc')
});

// Booking validation schemas
export const createBookingSchema = z.object({
  eventId: z.string().cuid('Please provide a valid event ID'),
  quantity: z.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1').max(10, 'Maximum 10 tickets per booking'),
  idempotencyKey: z.string().min(1, 'Idempotency key is required').max(100, 'Idempotency key must be less than 100 characters').optional()
});

export const updateBookingSchema = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED', 'PENDING']).refine(
    (status) => ['CONFIRMED', 'CANCELLED', 'PENDING'].includes(status),
    { message: 'Status must be one of: CONFIRMED, CANCELLED, PENDING' }
  )
});

// Common validation schemas
export const idParamSchema = z.object({
  id: z.string().cuid('Please provide a valid ID')
});

export const paginationSchema = z.object({
  page: z.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(10)
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type EventQueryInput = z.infer<typeof eventQuerySchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type IdParam = z.infer<typeof idParamSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
