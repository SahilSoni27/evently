"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reminderWorker = exports.analyticsWorker = exports.emailWorker = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = require("ioredis");
const prisma_1 = __importDefault(require("../lib/prisma"));
const analyticsCache_1 = __importDefault(require("../utils/analyticsCache"));
const emailService_1 = __importDefault(require("../services/emailService"));
// Create Redis connection for workers
const redisConnection = new ioredis_1.Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    lazyConnect: true,
});
// Enhanced email service with templates
class EmailService {
    static async sendBookingConfirmation(data) {
        console.log(`📧 Sending booking confirmation to ${data.to}`);
        try {
            // Use provided user data or look up from database
            let userName = data.userName;
            let eventName = data.eventName;
            let venue = data.venue;
            // Only look up from database if data is not provided
            if (!userName || !eventName || !venue) {
                const [user, event] = await Promise.all([
                    !userName ? prisma_1.default.user.findUnique({ where: { email: data.to } }) : null,
                    data.eventId && (!eventName || !venue) ? prisma_1.default.event.findUnique({ where: { id: data.eventId } }) : null
                ]);
                userName = userName || user?.name || 'User';
                eventName = eventName || event?.name || 'Unknown Event';
                venue = venue || event?.venue || 'TBD';
            }
            const success = await emailService_1.default.sendBookingConfirmation({
                to: data.to,
                userName,
                eventName,
                venue,
                eventDate: data.eventStartTime ? new Date(data.eventStartTime).toLocaleDateString() : 'TBD',
                eventTime: data.eventStartTime ? new Date(data.eventStartTime).toLocaleTimeString() : 'TBD',
                quantity: data.ticketQuantity || 1,
                totalPrice: data.totalPrice || 0,
                bookingId: data.bookingId || 'N/A'
            });
            if (success) {
                console.log(`✅ Booking confirmation sent to ${data.to}`);
            }
            else {
                throw new Error('Failed to send email');
            }
        }
        catch (error) {
            console.error(`❌ Failed to send booking confirmation:`, error);
            throw error;
        }
    }
    static async sendEventReminder(data) {
        console.log(`⏰ Sending event reminder to ${data.to}`);
        try {
            // Use provided user data or look up from database
            let userName = data.userName;
            if (!userName) {
                const user = await prisma_1.default.user.findUnique({ where: { email: data.to } });
                userName = user?.name || 'User';
            }
            const eventDate = data.eventStartTime ? new Date(data.eventStartTime) : new Date();
            const hoursUntilEvent = Math.max(0, Math.round((eventDate.getTime() - Date.now()) / (1000 * 60 * 60)));
            const success = await emailService_1.default.sendEventReminder({
                to: data.to,
                userName,
                eventName: data.eventName || 'Event',
                venue: data.venue || 'TBD',
                eventDate: eventDate.toLocaleDateString(),
                eventTime: eventDate.toLocaleTimeString(),
                hoursUntilEvent
            });
            if (!success)
                throw new Error('Failed to send reminder email');
            console.log(`✅ Event reminder sent to ${data.to}`);
            return true;
        }
        catch (error) {
            console.error(`❌ Failed to send event reminder:`, error);
            return false;
        }
    }
    static async sendEventUpdate(data) {
        console.log(`📢 Sending event update to ${data.to}`);
        console.log(`Event: ${data.eventName} - ${data.customMessage}`);
        // TODO: Implement event update template
        return true;
    }
    static async sendBookingCancellation(data) {
        console.log(`❌ Sending booking cancellation to ${data.to}`);
        console.log(`Event: ${data.eventName} booking has been cancelled`);
        // TODO: Implement cancellation template
        return true;
    }
    static async sendWaitlistConfirmation(data) {
        console.log(`📋 Sending waitlist confirmation to ${data.to}`);
        try {
            // Use provided user data or look up from database
            let userName = data.userName;
            let eventName = data.eventName;
            let venue = data.venue;
            if (!userName || !eventName || !venue) {
                const [user, event] = await Promise.all([
                    !userName ? prisma_1.default.user.findUnique({ where: { email: data.to } }) : null,
                    data.eventId && (!eventName || !venue) ? prisma_1.default.event.findUnique({ where: { id: data.eventId } }) : null
                ]);
                userName = userName || user?.name || 'User';
                eventName = eventName || event?.name || 'Event';
                venue = venue || event?.venue || 'TBD';
            }
            const success = await emailService_1.default.sendWaitlistConfirmation({
                to: data.to,
                userName,
                eventName,
                venue,
                eventDate: data.eventStartTime ? new Date(data.eventStartTime).toLocaleDateString() : 'TBD',
                position: 1 // TODO: Get actual position from waitlist
            });
            if (success) {
                console.log(`✅ Waitlist confirmation sent to ${data.to}`);
            }
            else {
                throw new Error('Failed to send email');
            }
        }
        catch (error) {
            console.error(`❌ Failed to send waitlist confirmation:`, error);
            throw error;
        }
    }
    static async sendWaitlistPromotion(data) {
        console.log(`🎉 Sending waitlist promotion to ${data.to}`);
        try {
            // Use provided user data or look up from database
            let userName = data.userName;
            let eventName = data.eventName;
            let venue = data.venue;
            if (!userName || !eventName || !venue) {
                const [user, event] = await Promise.all([
                    !userName ? prisma_1.default.user.findUnique({ where: { email: data.to } }) : null,
                    data.eventId && (!eventName || !venue) ? prisma_1.default.event.findUnique({ where: { id: data.eventId } }) : null
                ]);
                userName = userName || user?.name || 'User';
                eventName = eventName || event?.name || 'Event';
                venue = venue || event?.venue || 'TBD';
            }
            const success = await emailService_1.default.sendWaitlistPromotion({
                to: data.to,
                userName,
                eventName,
                venue,
                eventDate: data.eventStartTime ? new Date(data.eventStartTime).toLocaleDateString() : 'TBD',
                deadlineHours: 24 // Give users 24 hours to accept the promotion
            });
            if (success) {
                console.log(`✅ Waitlist promotion sent to ${data.to}`);
            }
            else {
                throw new Error('Failed to send email');
            }
        }
        catch (error) {
            console.error(`❌ Failed to send waitlist promotion:`, error);
            throw error;
        }
    }
}
// Email worker
exports.emailWorker = new bullmq_1.Worker('email-notifications', async (job) => {
    const { data } = job;
    console.log(`Processing email job: ${data.type} for ${data.to}`);
    try {
        switch (data.type) {
            case 'booking_confirmation':
                await EmailService.sendBookingConfirmation(data);
                break;
            case 'event_reminder':
                await EmailService.sendEventReminder(data);
                break;
            case 'event_update':
                await EmailService.sendEventUpdate(data);
                break;
            case 'booking_cancellation':
                await EmailService.sendBookingCancellation(data);
                break;
            case 'waitlist_confirmation':
                await EmailService.sendWaitlistConfirmation(data);
                break;
            case 'waitlist_promotion':
                await EmailService.sendWaitlistPromotion(data);
                break;
            default:
                throw new Error(`Unknown email job type: ${data.type}`);
        }
        console.log(`✅ Email job completed: ${data.type}`);
        return { success: true, type: data.type, to: data.to };
    }
    catch (error) {
        console.error(`❌ Email job failed: ${data.type}`, error);
        throw error;
    }
}, {
    connection: redisConnection,
    concurrency: 5, // Process up to 5 email jobs concurrently
});
// Analytics worker
exports.analyticsWorker = new bullmq_1.Worker('analytics-processing', async (job) => {
    const { data } = job;
    console.log(`Processing analytics job: ${data.type}`);
    try {
        switch (data.type) {
            case 'update_event_stats':
                await updateEventStatistics(data.eventId);
                break;
            case 'generate_daily_report':
                await generateDailyReport(data.date);
                break;
            case 'cleanup_old_data':
                await cleanupOldData(data.retentionDays || 90);
                break;
            default:
                throw new Error(`Unknown analytics job type: ${data.type}`);
        }
        console.log(`✅ Analytics job completed: ${data.type}`);
        return { success: true, type: data.type };
    }
    catch (error) {
        console.error(`❌ Analytics job failed: ${data.type}`, error);
        throw error;
    }
}, {
    connection: redisConnection,
    concurrency: 2, // Process analytics jobs with lower concurrency
});
// Event reminders worker
exports.reminderWorker = new bullmq_1.Worker('event-reminders', async (job) => {
    const { data } = job;
    console.log(`Processing reminder job for event: ${data.eventId}`);
    try {
        // Get event details and all attendees
        const event = await prisma_1.default.event.findUnique({
            where: { id: data.eventId },
            include: {
                bookings: {
                    where: { status: 'CONFIRMED' },
                    include: {
                        user: {
                            select: {
                                email: true,
                                name: true,
                            }
                        }
                    }
                }
            }
        });
        if (!event) {
            throw new Error(`Event not found: ${data.eventId}`);
        }
        // Send reminder emails to all attendees
        const reminderPromises = event.bookings.map(booking => EmailService.sendEventReminder({
            type: 'event_reminder',
            to: booking.user.email,
            eventId: event.id,
            eventName: event.name,
            userName: booking.user.name || 'Guest',
            eventStartTime: event.startTime,
            venue: event.venue,
        }));
        await Promise.all(reminderPromises);
        console.log(`✅ Sent ${event.bookings.length} reminder emails for event: ${event.name}`);
        return {
            success: true,
            eventId: data.eventId,
            remindersSent: event.bookings.length
        };
    }
    catch (error) {
        console.error(`❌ Reminder job failed for event: ${data.eventId}`, error);
        throw error;
    }
}, {
    connection: redisConnection,
    concurrency: 3,
});
// Analytics helper functions
async function updateEventStatistics(eventId) {
    // Update event statistics and invalidate cache
    const stats = await prisma_1.default.booking.aggregate({
        where: { eventId, status: 'CONFIRMED' },
        _sum: { quantity: true, totalPrice: true },
        _count: { id: true }
    });
    // Update event with aggregated stats (if you have such fields)
    await prisma_1.default.event.update({
        where: { id: eventId },
        data: {
        // These fields would need to be added to your schema
        // totalBookings: stats._count.id,
        // totalRevenue: stats._sum.totalPrice,
        }
    });
    // Invalidate analytics cache
    await analyticsCache_1.default.invalidateEventCache(eventId);
}
async function generateDailyReport(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    // Generate daily statistics
    const [dailyBookings, dailyRevenue, dailyEvents] = await Promise.all([
        prisma_1.default.booking.count({
            where: {
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        }),
        prisma_1.default.booking.aggregate({
            where: {
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            _sum: { totalPrice: true }
        }),
        prisma_1.default.event.count({
            where: {
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        })
    ]);
    const report = {
        date: date.toISOString().split('T')[0],
        bookings: dailyBookings,
        revenue: dailyRevenue._sum.totalPrice || 0,
        events: dailyEvents,
        generatedAt: new Date()
    };
    console.log('📊 Daily Report Generated:', report);
    // In production, you might save this to a reports table or send to admin
    return report;
}
async function cleanupOldData(retentionDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    // Example cleanup operations
    const deletedCount = await prisma_1.default.booking.deleteMany({
        where: {
            status: 'CANCELLED',
            createdAt: { lt: cutoffDate }
        }
    });
    console.log(`🧹 Cleaned up ${deletedCount.count} old cancelled bookings`);
    // Invalidate all analytics cache after cleanup
    await analyticsCache_1.default.invalidateAll();
    return { deletedBookings: deletedCount.count };
}
// Worker event handlers
exports.emailWorker.on('completed', (job) => {
    console.log(`Email job ${job.id} completed`);
});
exports.emailWorker.on('failed', (job, err) => {
    console.error(`Email job ${job?.id} failed:`, err);
});
exports.analyticsWorker.on('completed', (job) => {
    console.log(`Analytics job ${job.id} completed`);
});
exports.analyticsWorker.on('failed', (job, err) => {
    console.error(`Analytics job ${job?.id} failed:`, err);
});
exports.reminderWorker.on('completed', (job) => {
    console.log(`Reminder job ${job.id} completed`);
});
exports.reminderWorker.on('failed', (job, err) => {
    console.error(`Reminder job ${job?.id} failed:`, err);
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Shutting down workers...');
    await Promise.all([
        exports.emailWorker.close(),
        exports.analyticsWorker.close(),
        exports.reminderWorker.close(),
    ]);
    await redisConnection.disconnect();
    process.exit(0);
});
