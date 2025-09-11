import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  joinWaitlist,
  leaveWaitlist,
  getEventWaitlist,
  getUserWaitlist,
  promoteFromWaitlist
} from '../controllers/waitlistController';

const router = Router();

// All waitlist routes require authentication
router.use(requireAuth);

// POST /api/events/:eventId/waitlist - Join event waitlist
router.post('/:eventId/waitlist', joinWaitlist);

// DELETE /api/events/:eventId/waitlist - Leave event waitlist
router.delete('/:eventId/waitlist', leaveWaitlist);

// GET /api/events/:eventId/waitlist - Get waitlist for event (admin only)
router.get('/:eventId/waitlist', getEventWaitlist);

// GET /api/users/:userId/waitlist - Get user's waitlist entries
router.get('/users/:userId/waitlist', getUserWaitlist);

// POST /api/admin/events/:eventId/waitlist/promote - Promote users from waitlist (admin only)
router.post('/admin/:eventId/waitlist/promote', promoteFromWaitlist);

export default router;
