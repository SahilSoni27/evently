"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const schemas_1 = require("../validation/schemas");
const router = (0, express_1.Router)();
// POST /api/auth/register - Register new user
router.post('/register', (0, validation_1.validateBody)(schemas_1.registerSchema), authController_1.register);
// POST /api/auth/login - Login user
router.post('/login', (0, validation_1.validateBody)(schemas_1.loginSchema), authController_1.login);
// GET /api/auth/profile - Get current user profile (protected)
router.get('/profile', auth_1.requireAuth, authController_1.getProfile);
// POST /api/auth/logout - Logout (simple response since JWT is stateless)
router.post('/logout', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Logged out successfully. Please remove the token from client storage.'
    });
});
exports.default = router;
