import express from 'express';
import { 
  getSeatsForEvent,
  bookSeats,
  checkBookingStatus,
  generateSeatsForEvent,
  getVenueLayout
} from '../controllers/seatController';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// GET /api/seats/event/:eventId - Get all seats for an event
router.get('/event/:eventId', getSeatsForEvent);

// POST /api/seats/book - Book specific seats using queue system
router.post('/book', requireAuth, bookSeats);

// GET /api/seats/booking-status/:jobId - Check booking status
router.get('/booking-status/:jobId', requireAuth, checkBookingStatus);

// POST /api/seats/generate - Generate seats for an event (Admin only)
router.post('/generate', requireAuth, generateSeatsForEvent);

// GET /api/seats/venue/:venueId - Get venue layout
router.get('/venue/:venueId', getVenueLayout);

export default router;
