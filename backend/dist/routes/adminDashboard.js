"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminDashboardController_1 = require("../controllers/adminDashboardController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Apply auth middleware to all admin routes
router.use(auth_1.requireAuth);
// TODO: Add admin role check middleware here
// router.use(adminMiddleware);
// Admin dashboard routes
router.get('/dashboard/overview', adminDashboardController_1.getAdminOverview);
router.get('/users', adminDashboardController_1.getAllUsers);
router.get('/users/:userId/details', adminDashboardController_1.getUserDetails);
exports.default = router;
