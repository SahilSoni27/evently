import { Router } from 'express';
import { z } from 'zod';
import {
  createBooking,
  getUserBookings,
  cancelBooking,
  getAllBookings
} from '../controllers/bookingController';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validation';
import {
  createBookingSchema,
  idParamSchema
} from '../validation/schemas';

const router = Router();

// POST /api/bookings - Create a new booking (Authenticated users)
router.post(
  '/',
  requireAuth,
  validateBody(createBookingSchema),
  createBooking
);

// GET /api/bookings/user/:userId - Get user bookings (Own bookings or Admin)
router.get(
  '/user/:userId',
  requireAuth,
  validateParams(z.object({ userId: z.string().cuid('Invalid user ID') })),
  getUserBookings
);

// DELETE /api/bookings/:id - Cancel booking (Own booking or Admin)
router.delete(
  '/:id',
  requireAuth,
  validateParams(idParamSchema),
  cancelBooking
);

// GET /api/bookings - Get all bookings (Admin only)
router.get(
  '/',
  requireAuth,
  requireAdmin,
  getAllBookings
);

export default router;
