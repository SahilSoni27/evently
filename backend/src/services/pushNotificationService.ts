import webpush from 'web-push';
import prisma from '../lib/prisma';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

class PushNotificationService {
  private static instance: PushNotificationService;
  private initialized = false;

  private constructor() {
    this.initialize();
  }

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  private initialize() {
    if (this.initialized) return;

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidEmail = process.env.VAPID_EMAIL || process.env.EMAIL_USER;

    if (!vapidPublicKey || !vapidPrivateKey || !vapidEmail) {
      console.warn('⚠️ VAPID keys not configured. Push notifications will not work.');
      console.warn('Please set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_EMAIL in your .env file');
      return;
    }

    webpush.setVapidDetails(
      `mailto:${vapidEmail}`,
      vapidPublicKey,
      vapidPrivateKey
    );

    this.initialized = true;
    console.log('✅ Push notification service initialized');
  }

  // Subscribe a user to push notifications
  async subscribe(userId: string, subscription: PushSubscription): Promise<boolean> {
    try {
      if (!this.initialized) {
        throw new Error('Push notification service not initialized');
      }

      // Store subscription in database
      await prisma.pushSubscription.upsert({
        where: { userId },
        update: {
          endpoint: subscription.endpoint,
          p256dhKey: subscription.keys.p256dh,
          authKey: subscription.keys.auth,
          updatedAt: new Date()
        },
        create: {
          userId,
          endpoint: subscription.endpoint,
          p256dhKey: subscription.keys.p256dh,
          authKey: subscription.keys.auth
        }
      });

      console.log(`✅ User ${userId} subscribed to push notifications`);
      return true;
    } catch (error) {
      console.error('Failed to subscribe user to push notifications:', error);
      return false;
    }
  }

  // Unsubscribe a user from push notifications
  async unsubscribe(userId: string): Promise<boolean> {
    try {
      await prisma.pushSubscription.delete({
        where: { userId }
      });

      console.log(`✅ User ${userId} unsubscribed from push notifications`);
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe user from push notifications:', error);
      return false;
    }
  }

  // Send push notification to a specific user
  async sendToUser(userId: string, payload: NotificationPayload): Promise<boolean> {
    try {
      if (!this.initialized) {
        console.warn('Push notification service not initialized');
        return false;
      }

      const subscription = await prisma.pushSubscription.findUnique({
        where: { userId }
      });

      if (!subscription) {
        console.log(`No push subscription found for user ${userId}`);
        return false;
      }

      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dhKey,
          auth: subscription.authKey
        }
      };

      await webpush.sendNotification(
        pushSubscription,
        JSON.stringify(payload)
      );

      console.log(`✅ Push notification sent to user ${userId}`);
      return true;
    } catch (error: any) {
      console.error(`Failed to send push notification to user ${userId}:`, error);

      // Handle expired subscriptions
      if (error.statusCode === 410 || error.statusCode === 404) {
        console.log(`Removing expired subscription for user ${userId}`);
        await this.unsubscribe(userId);
      }

      return false;
    }
  }

  // Send push notification to multiple users
  async sendToMultipleUsers(userIds: string[], payload: NotificationPayload): Promise<{ success: number; failed: number }> {
    const results = await Promise.allSettled(
      userIds.map(userId => this.sendToUser(userId, payload))
    );

    const success = results.filter(result => result.status === 'fulfilled' && result.value).length;
    const failed = results.length - success;

    return { success, failed };
  }

  // Send notification to all users subscribed to an event
  async sendEventNotification(eventId: string, payload: NotificationPayload): Promise<{ success: number; failed: number }> {
    try {
      // Get all users who have bookings for this event
      const bookings = await prisma.booking.findMany({
        where: {
          eventId,
          status: 'CONFIRMED'
        },
        select: {
          userId: true
        },
        distinct: ['userId']
      });

      const userIds = bookings.map(booking => booking.userId);

      if (userIds.length === 0) {
        console.log(`No confirmed bookings found for event ${eventId}`);
        return { success: 0, failed: 0 };
      }

      return await this.sendToMultipleUsers(userIds, payload);
    } catch (error) {
      console.error('Failed to send event notification:', error);
      return { success: 0, failed: 0 };
    }
  }

  // Send booking confirmation push notification
  async sendBookingConfirmation(bookingId: string): Promise<boolean> {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          event: {
            select: {
              name: true,
              startTime: true,
              venue: true
            }
          },
          user: {
            select: {
              id: true
            }
          }
        }
      });

      if (!booking) {
        console.error(`Booking ${bookingId} not found`);
        return false;
      }

      const payload: NotificationPayload = {
        title: '🎫 Booking Confirmed',
        body: `Your booking for "${booking.event.name}" has been confirmed!`,
        icon: '/icons/ticket-confirmation.png',
        badge: '/icons/badge.png',
        tag: `booking-${bookingId}`,
        data: {
          type: 'booking_confirmation',
          bookingId,
          eventId: booking.eventId
        },
        actions: [
          {
            action: 'view_ticket',
            title: 'View Ticket'
          },
          {
            action: 'view_event',
            title: 'View Event'
          }
        ]
      };

      return await this.sendToUser(booking.user.id, payload);
    } catch (error) {
      console.error('Failed to send booking confirmation push notification:', error);
      return false;
    }
  }

  // Send event reminder push notification
  async sendEventReminder(eventId: string, reminderType: 'day_before' | 'hour_before' | 'starting_soon'): Promise<{ success: number; failed: number }> {
    try {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          name: true,
          startTime: true,
          venue: true
        }
      });

      if (!event) {
        console.error(`Event ${eventId} not found`);
        return { success: 0, failed: 0 };
      }

      let title: string;
      let body: string;

      switch (reminderType) {
        case 'day_before':
          title = '📅 Event Tomorrow';
          body = `Don't forget: "${event.name}" is tomorrow at ${event.venue}`;
          break;
        case 'hour_before':
          title = '⏰ Event Starting Soon';
          body = `"${event.name}" starts in 1 hour at ${event.venue}`;
          break;
        case 'starting_soon':
          title = '🚀 Event Starting Now';
          body = `"${event.name}" is starting now at ${event.venue}`;
          break;
      }

      const payload: NotificationPayload = {
        title,
        body,
        icon: '/icons/event-reminder.png',
        badge: '/icons/badge.png',
        tag: `event-reminder-${eventId}-${reminderType}`,
        data: {
          type: 'event_reminder',
          eventId,
          reminderType
        },
        actions: [
          {
            action: 'view_event',
            title: 'View Event'
          },
          {
            action: 'view_ticket',
            title: 'View Ticket'
          }
        ]
      };

      return await this.sendEventNotification(eventId, payload);
    } catch (error) {
      console.error('Failed to send event reminder push notification:', error);
      return { success: 0, failed: 0 };
    }
  }

  // Send waitlist promotion notification
  async sendWaitlistPromotion(waitlistEntryId: string): Promise<boolean> {
    try {
      const waitlistEntry = await prisma.waitlist.findUnique({
        where: { id: waitlistEntryId },
        include: {
          event: {
            select: {
              name: true,
              startTime: true,
              venue: true
            }
          },
          user: {
            select: {
              id: true
            }
          }
        }
      });

      if (!waitlistEntry) {
        console.error(`Waitlist entry ${waitlistEntryId} not found`);
        return false;
      }

      const payload: NotificationPayload = {
        title: '🎉 Spot Available!',
        body: `A spot opened up for "${waitlistEntry.event.name}" - book now!`,
        icon: '/icons/waitlist-promotion.png',
        badge: '/icons/badge.png',
        tag: `waitlist-promotion-${waitlistEntryId}`,
        data: {
          type: 'waitlist_promotion',
          eventId: waitlistEntry.eventId,
          waitlistEntryId
        },
        actions: [
          {
            action: 'book_now',
            title: 'Book Now'
          },
          {
            action: 'view_event',
            title: 'View Event'
          }
        ]
      };

      return await this.sendToUser(waitlistEntry.user.id, payload);
    } catch (error) {
      console.error('Failed to send waitlist promotion push notification:', error);
      return false;
    }
  }

  // Get VAPID public key for client-side subscription
  getVapidPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY || null;
  }
}

export default PushNotificationService.getInstance();
