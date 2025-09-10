"use strict";
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const validation_1 = require("../middleware/validation");
const validation_2 = require("../utils/validation");
const router = (0, express_1.Router)();
// POST /api/auth/register - Register new user
router.post('/register', rateLimiter_1.authLimiter, (0, validation_1.validateRequest)({ body: validation_2.registerSchema }), authController_1.register);
// POST /api/auth/login - Login user
router.post('/login', rateLimiter_1.authLimiter, (0, validation_1.validateRequest)({ body: validation_2.loginSchema }), authController_1.login);
// GET /api/auth/profile - Get current user profile (protected)
router.get('/profile', auth_1.requireAuth, authController_1.getProfile);
// POST /api/auth/logout - Logout (simple response since JWT is stateless)
router.post('/logout', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Logged out successfully. Please remove the token from client storage.'
    });
});
module.exports = router;
