import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  subscribe,
  unsubscribe,
  getVapidKey,
  sendTestNotification,
  sendEventReminder
} from '../controllers/notificationController';

const router = Router();

// Public route - get VAPID key for client-side subscription
router.get('/vapid-key', getVapidKey);

// Authenticated routes
router.post('/subscribe', requireAuth, subscribe);
router.post('/unsubscribe', requireAuth, unsubscribe);

// Admin routes
router.post('/test', requireAuth, sendTestNotification);
router.post('/event/:eventId/reminder', requireAuth, sendEventReminder);

export default router;
