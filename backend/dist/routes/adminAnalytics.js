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
// GET /api/admin/analytics/overview - Get high-level overview statistics
router.get('/overview', adminAnalyticsController_1.getOverviewStats);
// GET /api/admin/analytics/events - Get event performance analytics
router.get('/events', adminAnalyticsController_1.getEventAnalytics);
// GET /api/admin/analytics/bookings - Get booking trends and analytics
router.get('/bookings', adminAnalyticsController_1.getBookingAnalytics);
// GET /api/admin/analytics/users - Get user registration and activity analytics
router.get('/users', adminAnalyticsController_1.getUserAnalytics);
// GET /api/admin/analytics/revenue - Get revenue breakdown and trends
router.get('/revenue', adminAnalyticsController_1.getRevenueAnalytics);
exports.default = router;
