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

// GET /api/admin/data/overview - Get high-level overview statistics
router.get('/overview', getOverviewStats);

// GET /api/admin/data/events - Get event performance data
router.get('/events', getEventAnalytics);

// GET /api/admin/data/bookings - Get booking trends and data
router.get('/bookings', getBookingAnalytics);

// GET /api/admin/data/users - Get user registration and activity data
router.get('/users', getUserAnalytics);

// GET /api/admin/data/revenue - Get revenue breakdown and trends
router.get('/revenue', getRevenueAnalytics);

export default router;
