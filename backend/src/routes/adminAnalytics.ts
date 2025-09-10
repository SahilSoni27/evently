import { Router } from 'express';
import { 
  getOverviewStats,
  getEventAnalytics,
  getBookingAnalytics,
  getUserAnalytics,
  getRevenueAnalytics
} from '../controllers/adminAnalyticsController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// All admin analytics routes require authentication and admin role
router.use(requireAuth);

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
router.get('/overview', getOverviewStats);

// GET /api/admin/analytics/events - Get event performance analytics
router.get('/events', getEventAnalytics);

// GET /api/admin/analytics/bookings - Get booking trends and analytics
router.get('/bookings', getBookingAnalytics);

// GET /api/admin/analytics/users - Get user registration and activity analytics
router.get('/users', getUserAnalytics);

// GET /api/admin/analytics/revenue - Get revenue breakdown and trends
router.get('/revenue', getRevenueAnalytics);

export default router;
