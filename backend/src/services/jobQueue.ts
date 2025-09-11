import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

// Create Redis connection for BullMQ
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

// Email notification job interface
export interface EmailJobData {
  type: 'booking_confirmation' | 'event_reminder' | 'booking_cancellation' | 'event_update' | 'waitlist_confirmation' | 'waitlist_promotion';
  to: string;
  eventId?: string;
  bookingId?: string;
  eventName: string;
  userName?: string;
  eventStartTime: Date;
  venue?: string;
  customMessage?: string;
  ticketQuantity?: number;
  totalPrice?: number;
  qrCodeData?: string; // QR code for tickets
  ticketNumber?: string; // Formatted ticket number
}

// Analytics job interface
export interface AnalyticsJobData {
  type: 'update_event_stats' | 'generate_daily_report' | 'cleanup_old_data';
  eventId?: string;
  date?: Date;
  retentionDays?: number;
}

// Event reminder job interface
export interface ReminderJobData {
  type: 'event_reminder';
  eventId: string;
  reminderTime: Date;
}

// Create job queues
export const emailQueue = new Queue('email-notifications', {
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

export const analyticsQueue = new Queue('analytics-processing', {
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

export const reminderQueue = new Queue('event-reminders', {
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
export class JobScheduler {
  
  // Schedule booking confirmation email
  static async scheduleBookingConfirmation(data: EmailJobData) {
    return await emailQueue.add('booking-confirmation', data, {
      priority: 1, // High priority
    });
  }

  // Schedule event reminder email
  static async scheduleEventReminder(data: EmailJobData & ReminderJobData) {
    const delay = data.reminderTime.getTime() - Date.now();
    
    if (delay > 0) {
      return await emailQueue.add('event-reminder', data, {
        delay,
        priority: 2,
      });
    }
    
    // If reminder time is in the past, send immediately
    return await emailQueue.add('event-reminder', data, {
      priority: 2,
    });
  }

  // Schedule event update notification
  static async scheduleEventUpdateNotification(data: EmailJobData) {
    return await emailQueue.add('event-update', data, {
      priority: 1,
    });
  }

  // Schedule analytics update
  static async scheduleAnalyticsUpdate(data: AnalyticsJobData) {
    return await analyticsQueue.add('analytics-update', data, {
      priority: 3,
    });
  }

  // Schedule daily analytics report
  static async scheduleDailyReport() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0); // 2 AM next day
    
    const delay = tomorrow.getTime() - Date.now();
    
    return await analyticsQueue.add('daily-report', {
      type: 'generate_daily_report',
      date: tomorrow,
    }, {
      delay,
      repeat: { pattern: '0 2 * * *' }, // Daily at 2 AM
    });
  }

  // Cancel job by ID
  static async cancelJob(queueName: string, jobId: string) {
    const queue = queueName === 'email' ? emailQueue : 
                 queueName === 'analytics' ? analyticsQueue : 
                 reminderQueue;
    
    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
      return true;
    }
    return false;
  }

  // Get queue status
  static async getQueueStatus(queueName: string) {
    const queue = queueName === 'email' ? emailQueue : 
                 queueName === 'analytics' ? analyticsQueue : 
                 reminderQueue;
    
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

export default JobScheduler;
