"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const jobQueue_1 = __importDefault(require("../services/jobQueue"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All queue management routes require admin authentication
router.use(auth_1.requireAdmin);
// GET /api/admin/queues/status - Get all queue statuses
router.get('/status', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const [emailStatus, analyticsStatus, reminderStatus] = await Promise.all([
        jobQueue_1.default.getQueueStatus('email'),
        jobQueue_1.default.getQueueStatus('analytics'),
        jobQueue_1.default.getQueueStatus('reminder'),
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
router.post('/schedule-daily-report', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    await jobQueue_1.default.scheduleDailyReport();
    res.json({
        status: 'success',
        message: 'Daily report scheduled successfully'
    });
}));
// POST /api/admin/queues/cleanup - Schedule data cleanup
router.post('/cleanup', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { retentionDays = 90 } = req.body;
    await jobQueue_1.default.scheduleAnalyticsUpdate({
        type: 'cleanup_old_data',
        retentionDays: parseInt(retentionDays),
    });
    res.json({
        status: 'success',
        message: `Data cleanup scheduled for ${retentionDays} days retention`
    });
}));
// DELETE /api/admin/queues/:queueName/jobs/:jobId - Cancel a specific job
router.delete('/:queueName/jobs/:jobId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { queueName, jobId } = req.params;
    const success = await jobQueue_1.default.cancelJob(queueName, jobId);
    if (success) {
        res.json({
            status: 'success',
            message: 'Job cancelled successfully'
        });
    }
    else {
        res.status(404).json({
            status: 'error',
            message: 'Job not found'
        });
    }
}));
exports.default = router;
