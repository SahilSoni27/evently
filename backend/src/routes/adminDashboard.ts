import { Router } from 'express';
import { 
  getAdminOverview,
  getAllUsers,
  getUserDetails
} from '../controllers/adminDashboardController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all admin routes
router.use(requireAuth);

// TODO: Add admin role check middleware here
// router.use(adminMiddleware);

// Admin dashboard routes
router.get('/dashboard/overview', getAdminOverview);
router.get('/users', getAllUsers);
router.get('/users/:userId/details', getUserDetails);

export default router;
