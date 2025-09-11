import { Request, Response } from 'express';
import PushNotificationService from '../services/pushNotificationService';

// POST /api/notifications/subscribe - Subscribe to push notifications
export const subscribe = async (req: Request, res: Response) => {
  try {
    const { subscription } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'User authentication required'
      });
    }

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid subscription data'
      });
    }

    const success = await PushNotificationService.subscribe(userId, subscription);

    if (!success) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to subscribe to push notifications'
      });
    }

    res.json({
      status: 'success',
      message: 'Successfully subscribed to push notifications'
    });

  } catch (error) {
    console.error('Subscribe to push notifications error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to subscribe to push notifications'
    });
  }
};

// POST /api/notifications/unsubscribe - Unsubscribe from push notifications
export const unsubscribe = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'User authentication required'
      });
    }

    const success = await PushNotificationService.unsubscribe(userId);

    if (!success) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to unsubscribe from push notifications'
      });
    }

    res.json({
      status: 'success',
      message: 'Successfully unsubscribed from push notifications'
    });

  } catch (error) {
    console.error('Unsubscribe from push notifications error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to unsubscribe from push notifications'
    });
  }
};

// GET /api/notifications/vapid-key - Get VAPID public key for client
export const getVapidKey = async (req: Request, res: Response) => {
  try {
    const vapidKey = PushNotificationService.getVapidPublicKey();

    if (!vapidKey) {
      return res.status(503).json({
        status: 'error',
        message: 'Push notifications not configured'
      });
    }

    res.json({
      status: 'success',
      data: {
        vapidPublicKey: vapidKey
      }
    });

  } catch (error) {
    console.error('Get VAPID key error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get VAPID key'
    });
  }
};

// POST /api/notifications/test - Send test notification (admin only)
export const sendTestNotification = async (req: Request, res: Response) => {
  try {
    const { title, body, targetUserId } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        message: 'Admin access required'
      });
    }

    if (!title || !body) {
      return res.status(400).json({
        status: 'error',
        message: 'Title and body are required'
      });
    }

    const targetUser = targetUserId || userId;
    const success = await PushNotificationService.sendToUser(targetUser, {
      title,
      body,
      icon: '/icons/test-notification.png',
      badge: '/icons/badge.png',
      tag: 'test-notification',
      data: {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    });

    if (!success) {
      return res.status(404).json({
        status: 'error',
        message: 'User not subscribed to push notifications or notification failed'
      });
    }

    res.json({
      status: 'success',
      message: 'Test notification sent successfully'
    });

  } catch (error) {
    console.error('Send test notification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send test notification'
    });
  }
};

// POST /api/notifications/event/:eventId/reminder - Send event reminder (admin only)
export const sendEventReminder = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { reminderType } = req.body;
    const userRole = req.user?.role;

    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        message: 'Admin access required'
      });
    }

    if (!['day_before', 'hour_before', 'starting_soon'].includes(reminderType)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid reminder type. Must be: day_before, hour_before, or starting_soon'
      });
    }

    const result = await PushNotificationService.sendEventReminder(eventId, reminderType);

    res.json({
      status: 'success',
      message: `Event reminder sent to ${result.success} users`,
      data: {
        success: result.success,
        failed: result.failed
      }
    });

  } catch (error) {
    console.error('Send event reminder error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send event reminder'
    });
  }
};
