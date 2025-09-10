import { Router } from 'express';
import { register, login, getProfile } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { registerSchema, loginSchema } from '../validation/schemas';

const router = Router();

// POST /api/auth/register - Register new user
router.post('/register', validateBody(registerSchema), register);

// POST /api/auth/login - Login user
router.post('/login', validateBody(loginSchema), login);

// GET /api/auth/profile - Get current user profile (protected)
router.get('/profile', requireAuth, getProfile);

// POST /api/auth/logout - Logout (simple response since JWT is stateless)
router.post('/logout', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully. Please remove the token from client storage.'
  });
});

export default router;
