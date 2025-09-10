"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.requireAuth = void 0;
const jwt_1 = require("../utils/jwt");
// Middleware to require authentication
const requireAuth = (req, res, next) => {
    try {
        // Get token from Authorization header
        const token = (0, jwt_1.extractTokenFromHeader)(req.headers.authorization);
        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'Access denied. No token provided.'
            });
        }
        // Verify token
        const payload = (0, jwt_1.verifyToken)(token);
        if (!payload) {
            return res.status(401).json({
                status: 'error',
                message: 'Access denied. Invalid token.'
            });
        }
        // Add user info to request object
        req.user = {
            id: payload.userId,
            email: payload.email,
            role: payload.role
        };
        next();
    }
    catch (error) {
        return res.status(401).json({
            status: 'error',
            message: 'Access denied. Token verification failed.'
        });
    }
};
exports.requireAuth = requireAuth;
// Middleware to require admin role
const requireAdmin = (req, res, next) => {
    // First check if user is authenticated
    (0, exports.requireAuth)(req, res, () => {
        // Check if user has admin role
        if (req.user?.role !== 'ADMIN') {
            return res.status(403).json({
                status: 'error',
                message: 'Access denied. Admin privileges required.'
            });
        }
        next();
    });
};
exports.requireAdmin = requireAdmin;
