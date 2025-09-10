import { Router } from 'express';
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventStats
} from '../controllers/eventController';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import {
  createEventSchema,
  updateEventSchema,
  eventQuerySchema,
  idParamSchema
} from '../validation/schemas';

const router = Router();

// GET /api/events - List all events with pagination and search
router.get('/', validateQuery(eventQuerySchema), getEvents);

// GET /api/events/stats - Get event statistics (Admin only)
router.get('/stats', requireAuth, requireAdmin, getEventStats);

// GET /api/events/:id - Get single event details
router.get('/:id', validateParams(idParamSchema), getEventById);

// POST /api/events - Create new event (Admin only)
router.post(
  '/',
  requireAuth,
  requireAdmin,
  validateBody(createEventSchema),
  createEvent
);

// PUT /api/events/:id - Update event (Admin only)
router.put(
  '/:id',
  requireAuth,
  requireAdmin,
  validateParams(idParamSchema),
  validateBody(updateEventSchema),
  updateEvent
);

// DELETE /api/events/:id - Delete event (Admin only)
router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  validateParams(idParamSchema),
  deleteEvent
);

export default router;
