"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminAnalyticsController_1 = require("../controllers/adminAnalyticsController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All admin analytics routes require authentication and admin role
router.use(auth_1.requireAuth);
// Admin role check middleware
router.use((req, res, next) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({
            status: 'error',
            message: 'Access denied. Admin privileges required.'
        });
    }
    next();
});
// GET /api/admin/data/overview - Get high-level overview statistics
router.get('/overview', adminAnalyticsController_1.getOverviewStats);
// GET /api/admin/data/events - Get event performance data
router.get('/events', adminAnalyticsController_1.getEventAnalytics);
// GET /api/admin/data/bookings - Get booking trends and data
router.get('/bookings', adminAnalyticsController_1.getBookingAnalytics);
// GET /api/admin/data/users - Get user registration and activity data
router.get('/users', adminAnalyticsController_1.getUserAnalytics);
// GET /api/admin/data/revenue - Get revenue breakdown and trends
router.get('/revenue', adminAnalyticsController_1.getRevenueAnalytics);
exports.default = router;
