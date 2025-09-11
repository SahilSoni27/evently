import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import JobScheduler from '../services/jobQueue';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// All queue management routes require admin authentication
router.use(requireAdmin);

// GET /api/admin/queues/status - Get all queue statuses
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  const [emailStatus, analyticsStatus, reminderStatus] = await Promise.all([
    JobScheduler.getQueueStatus('email'),
    JobScheduler.getQueueStatus('analytics'),
    JobScheduler.getQueueStatus('reminder'),
  ]);

  res.json({
    status: 'success',
    data: {
      queues: {
        email: emailStatus,
        analytics: analyticsStatus,
        reminders: reminderStatus,
      },
      timestamp: new Date().toISOString(),
    }
  });
}));

// POST /api/admin/queues/schedule-daily-report - Manually trigger daily report
router.post('/schedule-daily-report', asyncHandler(async (req: Request, res: Response) => {
  await JobScheduler.scheduleDailyReport();
  
  res.json({
    status: 'success',
    message: 'Daily report scheduled successfully'
  });
}));

// POST /api/admin/queues/cleanup - Schedule data cleanup
router.post('/cleanup', asyncHandler(async (req: Request, res: Response) => {
  const { retentionDays = 90 } = req.body;
  
  await JobScheduler.scheduleAnalyticsUpdate({
    type: 'cleanup_old_data',
    retentionDays: parseInt(retentionDays),
  });
  
  res.json({
    status: 'success',
    message: `Data cleanup scheduled for ${retentionDays} days retention`
  });
}));

// DELETE /api/admin/queues/:queueName/jobs/:jobId - Cancel a specific job
router.delete('/:queueName/jobs/:jobId', asyncHandler(async (req: Request, res: Response) => {
  const { queueName, jobId } = req.params;
  
  const success = await JobScheduler.cancelJob(queueName, jobId);
  
  if (success) {
    res.json({
      status: 'success',
      message: 'Job cancelled successfully'
    });
  } else {
    res.status(404).json({
      status: 'error',
      message: 'Job not found'
    });
  }
}));

export default router;
