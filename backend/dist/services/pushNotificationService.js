"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web_push_1 = __importDefault(require("web-push"));
const prisma_1 = __importDefault(require("../lib/prisma"));
class PushNotificationService {
    constructor() {
        this.initialized = false;
        this.initialize();
    }
    static getInstance() {
        if (!PushNotificationService.instance) {
            PushNotificationService.instance = new PushNotificationService();
        }
        return PushNotificationService.instance;
    }
    initialize() {
        if (this.initialized)
            return;
        const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
        const vapidEmail = process.env.VAPID_EMAIL || process.env.EMAIL_USER;
        if (!vapidPublicKey || !vapidPrivateKey || !vapidEmail) {
            console.warn('⚠️ VAPID keys not configured. Push notifications will not work.');
            console.warn('Please set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_EMAIL in your .env file');
            return;
        }
        web_push_1.default.setVapidDetails(`mailto:${vapidEmail}`, vapidPublicKey, vapidPrivateKey);
        this.initialized = true;
        console.log('✅ Push notification service initialized');
    }
    // Subscribe a user to push notifications
    async subscribe(userId, subscription) {
        try {
            if (!this.initialized) {
                throw new Error('Push notification service not initialized');
            }
            // Store subscription in database
            await prisma_1.default.pushSubscription.upsert({
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
        }
        catch (error) {
            console.error('Failed to subscribe user to push notifications:', error);
            return false;
        }
    }
    // Unsubscribe a user from push notifications
    async unsubscribe(userId) {
        try {
            await prisma_1.default.pushSubscription.delete({
                where: { userId }
            });
            console.log(`✅ User ${userId} unsubscribed from push notifications`);
            return true;
        }
        catch (error) {
            console.error('Failed to unsubscribe user from push notifications:', error);
            return false;
        }
    }
    // Send push notification to a specific user
    async sendToUser(userId, payload) {
        try {
            if (!this.initialized) {
                console.warn('Push notification service not initialized');
                return false;
            }
            const subscription = await prisma_1.default.pushSubscription.findUnique({
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
            await web_push_1.default.sendNotification(pushSubscription, JSON.stringify(payload));
            console.log(`✅ Push notification sent to user ${userId}`);
            return true;
        }
        catch (error) {
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
    async sendToMultipleUsers(userIds, payload) {
        const results = await Promise.allSettled(userIds.map(userId => this.sendToUser(userId, payload)));
        const success = results.filter(result => result.status === 'fulfilled' && result.value).length;
        const failed = results.length - success;
        return { success, failed };
    }
    // Send notification to all users subscribed to an event
    async sendEventNotification(eventId, payload) {
        try {
            // Get all users who have bookings for this event
            const bookings = await prisma_1.default.booking.findMany({
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
        }
        catch (error) {
            console.error('Failed to send event notification:', error);
            return { success: 0, failed: 0 };
        }
    }
    // Send booking confirmation push notification
    async sendBookingConfirmation(bookingId) {
        try {
            const booking = await prisma_1.default.booking.findUnique({
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
            const payload = {
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
        }
        catch (error) {
            console.error('Failed to send booking confirmation push notification:', error);
            return false;
        }
    }
    // Send event reminder push notification
    async sendEventReminder(eventId, reminderType) {
        try {
            const event = await prisma_1.default.event.findUnique({
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
            let title;
            let body;
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
            const payload = {
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
        }
        catch (error) {
            console.error('Failed to send event reminder push notification:', error);
            return { success: 0, failed: 0 };
        }
    }
    // Send waitlist promotion notification
    async sendWaitlistPromotion(waitlistEntryId) {
        try {
            const waitlistEntry = await prisma_1.default.waitlist.findUnique({
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
            const payload = {
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
        }
        catch (error) {
            console.error('Failed to send waitlist promotion push notification:', error);
            return false;
        }
    }
    // Get VAPID public key for client-side subscription
    getVapidPublicKey() {
        return process.env.VAPID_PUBLIC_KEY || null;
    }
}
exports.default = PushNotificationService.getInstance();
