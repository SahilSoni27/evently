import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  subscribe,
  unsubscribe,
  getVapidKey,
  sendTestNotification,
  sendEventReminder
} from '../controllers/notificationController';
import {
  getUserNotifications,
  markNotificationAsRead,
  getNotificationStatus
} from '../controllers/notificationHistoryController';

const router = Router();

// Public route - get VAPID key for client-side subscription
router.get('/vapid-key', getVapidKey);

// Authenticated routes
router.post('/subscribe', requireAuth, subscribe);
router.post('/unsubscribe', requireAuth, unsubscribe);
router.get('/status', requireAuth, getNotificationStatus);

// Notification history routes
router.get('/user/:userId', requireAuth, getUserNotifications);
router.post('/mark-read/:notificationId', requireAuth, markNotificationAsRead);

// Admin routes
router.post('/test', requireAuth, sendTestNotification);
router.post('/event/:eventId/reminder', requireAuth, sendEventReminder);

export default router;
