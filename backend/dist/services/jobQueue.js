"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobScheduler = exports.reminderQueue = exports.analyticsQueue = exports.emailQueue = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = require("ioredis");
// Create Redis connection for BullMQ
const redisConnection = new ioredis_1.Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    lazyConnect: true,
});
// Create job queues
exports.emailQueue = new bullmq_1.Queue('email-notifications', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
    },
});
exports.analyticsQueue = new bullmq_1.Queue('analytics-processing', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 2,
        backoff: {
            type: 'fixed',
            delay: 30000,
        },
        removeOnComplete: 50,
        removeOnFail: 25,
    },
});
exports.reminderQueue = new bullmq_1.Queue('event-reminders', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 2,
        backoff: {
            type: 'fixed',
            delay: 60000,
        },
        removeOnComplete: 20,
        removeOnFail: 10,
    },
});
// Job scheduler functions
class JobScheduler {
    // Schedule booking confirmation email
    static async scheduleBookingConfirmation(data) {
        return await exports.emailQueue.add('booking-confirmation', data, {
            priority: 1, // High priority
        });
    }
    // Schedule event reminder email
    static async scheduleEventReminder(data) {
        const delay = data.reminderTime.getTime() - Date.now();
        if (delay > 0) {
            return await exports.emailQueue.add('event-reminder', data, {
                delay,
                priority: 2,
            });
        }
        // If reminder time is in the past, send immediately
        return await exports.emailQueue.add('event-reminder', data, {
            priority: 2,
        });
    }
    // Schedule event update notification
    static async scheduleEventUpdateNotification(data) {
        return await exports.emailQueue.add('event-update', data, {
            priority: 1,
        });
    }
    // Schedule analytics update
    static async scheduleAnalyticsUpdate(data) {
        return await exports.analyticsQueue.add('analytics-update', data, {
            priority: 3,
        });
    }
    // Schedule daily analytics report
    static async scheduleDailyReport() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(2, 0, 0, 0); // 2 AM next day
        const delay = tomorrow.getTime() - Date.now();
        return await exports.analyticsQueue.add('daily-report', {
            type: 'generate_daily_report',
            date: tomorrow,
        }, {
            delay,
            repeat: { pattern: '0 2 * * *' }, // Daily at 2 AM
        });
    }
    // Cancel job by ID
    static async cancelJob(queueName, jobId) {
        const queue = queueName === 'email' ? exports.emailQueue :
            queueName === 'analytics' ? exports.analyticsQueue :
                exports.reminderQueue;
        const job = await queue.getJob(jobId);
        if (job) {
            await job.remove();
            return true;
        }
        return false;
    }
    // Get queue status
    static async getQueueStatus(queueName) {
        const queue = queueName === 'email' ? exports.emailQueue :
            queueName === 'analytics' ? exports.analyticsQueue :
                exports.reminderQueue;
        const [waiting, active, completed, failed] = await Promise.all([
            queue.getWaiting(),
            queue.getActive(),
            queue.getCompleted(),
            queue.getFailed(),
        ]);
        return {
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length,
            total: waiting.length + active.length + completed.length + failed.length,
        };
    }
}
exports.JobScheduler = JobScheduler;
exports.default = JobScheduler;
